FROM alpine:3.22.1

RUN apk add --no-cache curl bash jq

RUN mkdir /app
WORKDIR /app

COPY ./src/app /app
COPY --chmod=666 ./src/ENV /tmp/ENV

ENV GITHUB_ENV=/tmp/ENV
ENV GITHUB_OUTPUT=/tmp/OUT

ENTRYPOINT [ "./mask-runner.sh", "./iam-key-sync-cron.sh" ]
