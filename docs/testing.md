# Event Stream Processing Lambda

Github: [bcgov/nr-apm-stack/event-stream-processing](https://github.com/bcgov/nr-apm-stack/tree/main/event-stream-processing)

## Local Testing

The following will start an http server listening on port 3000.

```
podman run --rm -p 3000:3000 ghcr.io/bcgov/nr-apm-stack-lambda:main
```

The root (/) will respond with the processed JSON. If for some reason you can't see the response (using Fluent Bit), you can have it print by setting the query parameter 'print' to be 'true' (?print=true).

### Sending Test Data - curl

The simpliest way is to just use a curl command. Switch to the [event-stream-processing directory](https://github.com/bcgov/nr-apm-stack/tree/main/event-stream-processing) and run:

```
curl -s -X POST -H "Content-Type: application/json" -d @samples/access-logs.json localhost:3000
```
or
```
curl -s -X POST -H "Content-Type: application/json" -d @samples/access-logs.json "http://localhost:3000?print=true"
```

Note that `-d` stands for `data`, and in the above example, a file is being sent, in this case `samples/access-logs.json` file. The `@` symbol should be used when sending files. However if you want, you can send a json string as follows:

```
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"date":1698269530.952,"@timestamp":"2023-10-25T21:32:10.952Z","log.logger":"com.zaxxer.hikari.pool.HikariPool","host":{"name":["encsabcamlt1288"],"os":{}},"@metadata.keyAsPath":"true","agent.type":"fluentbit","agent.version":"2.1","event.sequence":29000,"message":"NrBeApiPool - Added connection oracle.jdbc.driver.T4CConnection@14abd185","log.file.path":"/logs/oracle-api.log","ecs.version":"8.8","organization.name":"TeamSPAR","event.category":"web","agent.name":"nr-spar-202","organization.id":"org@domain.bc.ca","service.type":"oracle_api","event.dataset":"application.log.utc","service.name":"spar_oracle_api","event.kind":"event","event.ingested":"diagnostic","service.environment":"development","labels.project":"spar-oracle-api","log.level":"INFO"}' \
  localhost:3000
```

## Testing with Funbucks

Funbucks is a tool for generating Fluent Bit templated configurations for servers and Kubernetes (OpenShift) deployments. The Fluent Bit configuration can be setup to read in a sample file and send to a locally running Event Stream Processing Lambda for testing.

- First your should start up the Event Stream Processing Lambda as above (the http server listening on port 3000).
- Then inside [nr-funbucks repo](https://github.com/bcgov-nr/nr-funbuck) you generate a configuration for your server using the `-l` flag.
  - The `-l` flag tells funbucks to generate configuration files for a **local** Event Stream Processing Lambda
  - You should run: `./bin/dev gen -s -l app_spar_oracle` where `app_spar_oracle` is your application configuration id.
- Finally, you run Fluenbit either locally or in a container to send the output to the Event Stream Processing Lambda.

In case you need, here's how you can build and run Fluentbit locally with Docker:

Create a Dockerfile with this content:
```sh
FROM fluent/fluent-bit:2.1-debug
ADD . /fluent-bit/etc/
```

Then create your docker image with:
```sh
docker build -t fluentbit-local .
```

And then run your image with:
```sh
docker run -ti --rm \
 -e FLUENT_VERSION=2.1 \
 -e AGENT_NAME=testing-agent \
 -e FLUENT_CONF_HOME=/fluent-bit/etc/ \
 --network host \
 -v /logs:/logs \
 fluentbit-local
```

Note that `/logs` it's referring to the application log path configuration, defined at the input.conf file.

See the Funbucks repository for more details: https://github.com/bcgov-nr/nr-funbucks#readme
