AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  NR APM (Application Performance and Monitoring) Stack

# More info about Globals: https://github.com/awslabs/serverless-application-model/blob/master/docs/globals.rst
Globals:
  Function:
    Timeout: 60
    MemorySize: 1024
    Environment:
      Variables:
        LOG_LEVEL: !Ref LogLevel

Parameters:
  # Environment:
  #   Type: String
  #   AllowedValues:
  #     - dev
  #     - test
  #     - prod
  #   Default: "dev"
  LambdaHandler:
    Type: String
    Default: "index.kinesisStreamHandler"
  LogLevel:
    Type: String
    Default: "info"
  KinesisStreamShardCount:
    Type: Number
    MinValue: 1
    MaxValue: 10
    Default: 1
  OpensearchUrl:
    Type: String
    Default: ""
  VaultAddr:
    Type: String
    Description: "Vault server address (e.g., https://vault.internal.example.com:8200)"
    Default: ""
  VaultMount:
    Type: String
    Description: "Vault KV mount path"
    Default: "secret"
  VaultPathPrefix:
    Type: String
    Description: "Vault path prefix for IAM keys"
    Default: "aws/iam-keys"
  IamUserList:
    Type: CommaDelimitedList
    Description: "Comma-separated list of IDIR usernames to sync"
    Default: ""
  IamKeySyncSchedule:
    Type: String
    Description: "EventBridge schedule expression (e.g., rate(1 day) or cron(0 12 * * ? *))"
    Default: "rate(1 day)"
  SyncIntervalHours:
    Type: Number
    Description: "Minimum hours between sync runs"
    Default: 24
    MinValue: 1
    MaxValue: 168
  TokenRefreshThresholdHours:
    Type: Number
    Description: "Hours before token expiry to trigger refresh"
    Default: 24
    MinValue: 1
    MaxValue: 168

Resources:

  ## Roles

  LambdaStreamRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Join
        - ''
        - - !Ref AWS::Region
          - -nr-apm-stack-lambda-stream
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
            Action:
              - 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
      Policies:
        - PolicyName: 'kinesis-consumer'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Action:
                  - kinesis:SubscribeToShard
                  - kinesis:GetShardIterator
                  - kinesis:GetRecords
                  - kinesis:DescribeStream
                Resource:
                  - !GetAtt Stream.Arn
                Effect: Allow
              - Action:
                  - kinesis:ListStreams
                  - kinesis:ListShards
                Resource:
                  - "*"
                Effect: Allow
        - PolicyName: 'dlq-producer'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Action:
                  - firehose:PutRecord
                  - firehose:PutRecordBatch
                Resource:
                  - !GetAtt DlqStream.Arn
                Effect: Allow

  LambdaIamKeySyncRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Join
        - ''
        - - !Ref AWS::Region
          - -nr-apm-stack-lambda-iam-key-sync
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
            Action:
              - 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        - 'arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
      Policies:
        - PolicyName: 'ssm-parameter-read'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Action:
                  - ssm:GetParameter
                Resource:
                  - !Join
                    - ''
                    - - 'arn:aws:ssm:'
                      - !Ref AWS::Region
                      - ':'
                      - !Ref AWS::AccountId
                      - ':parameter/iam_users/*'
                Effect: Allow
        - PolicyName: 's3-state-bucket-access'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Action:
                  - s3:GetObject
                  - s3:PutObject
                Resource:
                  - !Join
                    - ''
                    - - !GetAtt IamKeySyncStateBucket.Arn
                      - "/*"
                Effect: Allow
              - Action:
                  - s3:ListBucket
                Resource:
                  - !GetAtt IamKeySyncStateBucket.Arn
                Effect: Allow

  FirehoseRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - firehose.amazonaws.com
            Action:
              - 'sts:AssumeRole'
      Policies:
        - PolicyName: 'firehose-dlq'
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Action:
                - glue:GetTable
                - glue:GetTableVersion
                - glue:GetTableVersions
                Resource:
                  - !Join
                    - ''
                    - - "arn:aws:glue:"
                      - !Ref AWS::Region
                      - ':'
                      - !Ref AWS::AccountId
                      - ':catalog'
                Effect: Allow
              - Action:
                - s3:AbortMultipartUpload
                - s3:GetBucketLocation
                - s3:GetObject
                - s3:ListBucket
                - s3:ListBucketMultipartUploads
                - s3:PutObject
                Resource:
                  - !GetAtt DlqBucket.Arn
                  - !Join
                    - ''
                    - - !GetAtt DlqBucket.Arn
                      - "/*"
                Effect: Allow
              - Action:
                - logs:PutLogEvents
                Resource:
                  - !Join
                    - ''
                    - - "arn:aws:logs:"
                      - !Ref AWS::Region
                      - ':'
                      - !Ref AWS::AccountId
                      - ':log-group:/aws/kinesisfirehose/'
                      - 'apm-dlq-stream'
                      - ':log-stream:DestinationDelivery'
                Effect: Allow

  ## Policies

  # Access to push documents to kinesis stream consumed by lambda
  # Roles created for team access to add documents to Opensearch should attach this policy.
  # (Would) replace nress-prod-nrm-agents policy
  # Disabled because we can't manage PBMMOps-BCGOV_ roles
  # AgentPolicy:
  #   Type: AWS::IAM::Policy
  #   Properties:
  #     PolicyName: nr-apm-stack-stream-put-document
  #     PolicyDocument:
  #       Version: '2012-10-17'
  #       Statement:
  #         - Action:
  #           - kinesis:PutRecord
  #           - kinesis:PutRecords
  #           Resource:
  #           - !GetAtt Stream.Arn
  #           Effect: Allow
  #     Roles:
  #       - !Join
  #         - ''
  #         - - PBMMOps-BCGOV_
  #           - !Ref Environment
  #           - _Project_Role_ES_Role

  ## Opensearch

  ## Lambda layers

  MaxmindGeoIpLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      CompatibleRuntimes:
        - nodejs24.x
      ContentUri: ./layer/maxmind-geoip-db
      LayerName: maxmind-geoip-db
      RetentionPolicy: Delete

  ## Lambda functions

  EventStreamProcessing:
    Type: AWS::Serverless::Function # More info about Function Resource: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction
    Properties:
      CodeUri: event-stream-processing/
      Handler: !Ref LambdaHandler
      Role: !GetAtt LambdaStreamRole.Arn
      Runtime: nodejs24.x
      Architectures:
      - x86_64
      Environment:
        Variables:
          DLQ_STREAM_NAME: !Ref DlqStream
          ES_URL: !Ref OpensearchUrl
          MAXMIND_DB_DIR: /opt/nodejs/asset
      Layers:
        - !Ref MaxmindGeoIpLayer
      Events:
        Stream:
          Type: Kinesis
          Properties:
            Stream: !GetAtt Stream.Arn
            BatchSize: 10000
            ParallelizationFactor: 2
            MaximumBatchingWindowInSeconds: 10
            MaximumRecordAgeInSeconds: -1
            MaximumRetryAttempts: -1
            StartingPosition: LATEST

    Metadata: # Manage esbuild properties
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2020
        Sourcemap: true
        EntryPoints:
        - src/index.ts

  IamKeySync:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: nr-iam-key-sync/
      Handler: lambda.handler
      Role: !GetAtt LambdaIamKeySyncRole.Arn
      Runtime: nodejs24.x
      Architectures:
        - x86_64
      Timeout: 300
      MemorySize: 512
      Environment:
        Variables:
          LOG_LEVEL: !Ref LogLevel
          VAULT_ADDR: !Ref VaultAddr
          VAULT_MOUNT: !Ref VaultMount
          VAULT_PATH_PREFIX: !Ref VaultPathPrefix
          S3_BUCKET_NAME: !Ref IamKeySyncStateBucket
          VAULT_TOKEN_S3_KEY: vault-token.json
          SYNC_STATE_S3_KEY: sync-state.json
          IAM_USER_LIST: !Join
            - ','
            - !Ref IamUserList
          SYNC_INTERVAL_HOURS: !Ref SyncIntervalHours
          TOKEN_REFRESH_THRESHOLD_HOURS: !Ref TokenRefreshThresholdHours
      Events:
        ScheduledSync:
          Type: Schedule
          Properties:
            Schedule: !Ref IamKeySyncSchedule
            Description: Scheduled IAM key sync to Vault
            Enabled: true
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        Minify: true
        Target: es2020
        Sourcemap: true
        EntryPoints:
          - src/lambda.ts

  ## S3 Buckets
  DlqBucket:
    Type: AWS::S3::Bucket
    Properties:
      LifecycleConfiguration:
        Rules:
          - ExpirationInDays: 7
            Status: Enabled

  IamKeySyncStateBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Join
        - ''
        - - !Ref AWS::Region
          - -nr-apm-stack-iam-key-sync-state
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      VersioningConfiguration:
        Status: Enabled

  ## Stream

  Stream:
    Type: AWS::Kinesis::Stream
    Properties:
      Name: nr-apm-stack-documents
      ShardCount: !Ref KinesisStreamShardCount
      # Enhanced can't be enabled...
      # https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/768
      # shard_level_metrics = [
      #   "IncomingRecords",
      #   "IncomingBytes",
      #   "OutgoingBytes",
      #   "IteratorAgeMilliseconds",
      #   "OutgoingRecords",
      #   "ReadProvisionedThroughputExceeded",
      #   "WriteProvisionedThroughputExceeded"
      # ]

  DlqStream:
    Type: AWS::KinesisFirehose::DeliveryStream
    Properties:
      DeliveryStreamName: apm-dlq-stream
      ExtendedS3DestinationConfiguration:
        RoleARN: !GetAtt FirehoseRole.Arn
        BucketARN: !GetAtt DlqBucket.Arn
        CloudWatchLoggingOptions:
          Enabled: true
          LogGroupName: /aws/kinesisfirehose/apm-dlq-stream
          LogStreamName: DestinationDelivery
  # SNS role so that opensearch can publish to topics
  SnsRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: "opensearch_sns_nress-prod"
      Policies:
        - PolicyName: "opensearch_sns_role_policy"
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: "Allow"
                Action:
                  - "sns:Publish"
                Resource:<% notifications.filter((n) => n.configType == 'sns').forEach((notification) => { %>
                - !GetAtt <%= notification.entity %>.TopicArn<% }); %>
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
        - Action: "sts:AssumeRole"
          Effect: "Allow"
          Principal:
            Service: "es.amazonaws.com"
          Sid: ""
<% notifications.filter((n) => n.configType == 'sns').forEach((notification) => { %>
  <%= notification.entity %>:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: "<%= notification.sns.topicArn %>"
      DisplayName: "<%= notification.name %>"<% if (notification.sns.subscriptions) { %><% notification.sns.subscriptions.forEach((sub) => { %>
  <%= sub.entity %>Sub:
    Type: AWS::SNS::Subscription
    Properties:
      Endpoint: <% if (sub.protocol == 'sqs') { %>!GetAtt <%= sub.entity %>.Arn<% } else if (sub.protocol == 'email' || sub.protocol == 'sns') { %>"<%= sub.endpoint %>"<% } %>
      Protocol: "<%= sub.protocol %>"
      TopicArn: !GetAtt <%= notification.entity %>.TopicArn <% if (sub.protocol == 'sqs') { %>
  <%= sub.entity %>:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: "<%= sub.endpoint %>"
  <%= sub.entity %>InlinePolicy:
    Type: AWS::SQS::QueueInlinePolicy
    Properties:
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
        - Sid: "Stmt1/<%= sub.entity %>/SQSDefaultPolicy"
          Effect: Allow
          Principal: "*"
          Action: sqs:SendMessage
          Resource: !GetAtt <%= sub.entity %>.Arn
      Queue: !Ref <%= sub.entity %><% }}) } -%>
<% }); -%>

Outputs:
  FunctionName:
    Description: "Function name"
    Value: !Ref EventStreamProcessing
  FunctionRole:
    Description: "Function Role"
    Value: !GetAtt LambdaStreamRole.Arn
  StreamARN:
    Description: "Stream ARN"
    Value: !GetAtt Stream.Arn
  IamKeySyncStateBucketName:
    Description: "IAM key sync state bucket name"
    Value: !Ref IamKeySyncStateBucket
  IamKeySyncStateBucketArn:
    Description: "IAM key sync state bucket ARN"
    Value: !GetAtt IamKeySyncStateBucket.Arn
  IamKeySyncFunctionName:
    Description: "IAM key sync Lambda function name"
    Value: !Ref IamKeySync
  IamKeySyncFunctionArn:
    Description: "IAM key sync Lambda function ARN"
    Value: !GetAtt IamKeySync.Arn
