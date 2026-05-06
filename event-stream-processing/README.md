# Event Stream Processing Lambda

## Local Testing - SAM

SAM can be used to test the application like it is running on AWS.

The sam deployment can be build by running:

```
sam build
```

In the root of the repository, run the following after you build (sam build).

```
sam local generate-event kinesis get-records --data "$(jq -c <event-stream-processing/samples/access-logs.json)" | sam local invoke -e - --skip-pull-image --parameter-overrides LambdaHandler="index.kinesisStreamDummyHandler" LogLevel="debug"
```

If you are running Podman, you may need to export DOCKER_HOST for this to work.

## Local Testing - Server

The following will start an http server listening on port 3000.

```
npm run start
```

The root (/) will respond with the processed JSON. If for some reason you can't see the response (using Fluent Bit), you can have it print by setting the query parameter 'print' to be 'true' (?print=true).

### Sending Test Data - curl

The simpliest way is to just use a curl command. Switch to the samples directory and run:

```
curl -s -X POST -H "Content-Type: application/json" -d @samples/access-logs.json localhost:3000
```
or
```
curl -s -X POST -H "Content-Type: application/json" -d @samples/access-logs.json "http://localhost:3000?print=true"
```

## Testing with Fluent Bit

For comprehensive end-to-end testing of Fluent Bit configurations, use the [nr-funbucks](https://github.com/bcgov-nr/nr-funbucks) repository. Funbucks generates Fluent Bit configurations and provides a complete local testing workflow:

1. **Start the local server** - This lambda processes logs (the command above)
2. **Generate Fluent Bit config** - Run `./bin/dev gen -l -s <server>` in nr-funbucks
3. **Prepare test data** - Place log files in `lambda/data/` directory
4. **Run Fluent Bit container** - Execute `./lambda/podman-run.sh` to send logs to this server
5. **Verify output** - Monitor this server for processed results

See [nr-funbucks Local Testing Workflow](https://github.com/bcgov-nr/nr-funbucks#local-testing-workflow) for complete step-by-step instructions and troubleshooting.
