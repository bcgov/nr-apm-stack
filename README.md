# NR APM (Application Performance and Monitoring) Stack

[NR APM (Application Performance and Monitoring) Stack](https://apm.io.nrs.gov.bc.ca/_plugin/_dashboards) allows teams to tactically respond to potential issues and strategically investigate their KPIs. It is delivered using OpenSearch hosted on AWS. OpenSearch is a open source search and analytics suite derived from Elasticsearch & Kibana.

<b>This README is for developers deploying NR APM Stack. See our Github site for [integration documentation](https://bcgov.github.io/nr-apm-stack/).</b>

# More Documentation

OpenSearch documentation is located here:

https://opensearch.org/docs/latest/

For end-users, our training, use cases and testimonials are located here:

https://apps.nrs.gov.bc.ca/int/confluence/x/GaRvBQ

For developers and product owners, our integration documentation is located here:

https://bcgov.github.io/nr-apm-stack/

# Getting Started

This project contains all the source code and supporting files for the APM Stack. It consists of a AWS SAM template, GitHub Actions and a Workflow CLI.

AWS SAM is used to deploy the infrastructure on AWS. The infrastructure includes an AWS Lambda application that retrieves documents from an Kinesis endpoint, processes them and passes them on to OpenSearch. GitHub Actions are used to automate the deployment and maintaince of the product.

The Workflow CLI handles the configuration of the OpenSearch product. It also has a support command for downloading GeoIP assets for the SAM deployment. The workflow is documented in it's own [README](./workflow-cli/README.md).

## Built With

### AWS Services

* [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service)
* [Amazon Lambda](https://aws.amazon.com/lambda/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon Kinesis](https://aws.amazon.com/kinesis/)

### Deployment Stack

* [Amazon SAM](https://aws.amazon.com/serverless/sam/)
* [Amazon Cloudformation](https://aws.amazon.com/cloudformation/)
* [Github Actions](https://github.com/features/actions)

### Languages

* [Typescript](https://www.typescriptlang.org)

## Local Development Setup

To develop, you need the following tools.

* Node.js - [Install Node.js 20](https://nodejs.org/en/), including the NPM package management tool.
* Podman (Docker) - [Install Podman](https://podman.io/docs/installation)

## Local Deployment Setup

If you want to run SAM locally, you will need to install the CLI in addition to the development tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)

### AWS - Environment Variables

The environment variables that SAM uses are documented in the [AWS CLI documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html). They can be obtained from the [Cloud PathFinder login page](https://login.nimbus.cloud.gov.bc.ca/) and clicking on "Click for Credentials" of the appropriate project/environment.

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `AWS_DEFAULT_REGION`

### Building

To build, run the following in your shell:

```bash
sam build
```

After you build, you can do local testing of the Lambda using sam as well as deploying it.

### Deploy

To deploy, run the following in your shell:

```bash
sam deploy --guided
```

For production, running the deployment locally is not recommended.

## Github Setup

### Secrets - Environment Specific

- AWS_ACCOUNT_NUMBER - The account number for the environment
- AWS_ROLE_TO_ASSUME - The role to assume. This role was manually setup in the account. See: [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

### Secrets - Global

- MAXMIND_LICENSE_KEY - The maxmind geo ip lookup licence. Also in Vault.

## Pushing to Kinesis

To push to Kinesis, you need the arn of the stream (nr-apm-stack-documents) and a role with a policy with permission to push to that stream. The arn is to be kept secret because it contains the account number.

## Principles
- Infrastructure as Code
- Configuration as Code
- GitOps:
  - Describe the entire system declaratively
  - Version the canonical desired system state in Git
  - Automatically apply approved changes to the desired state
  - Ensure correctness and alert on divergence with software agents
