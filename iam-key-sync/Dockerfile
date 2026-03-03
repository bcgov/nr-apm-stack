FROM node:lts-alpine

RUN apk add --no-cache curl bash jq

# Build workflow-cli
# NOTE: build context must be the repo root:
#   docker build -f iam-key-sync/Dockerfile -t iam-key-sync .
COPY workflow-cli /workflow-cli
WORKDIR /workflow-cli
RUN npm ci && npm run build

RUN mkdir /app
WORKDIR /app

COPY iam-key-sync/src/app /app

ENV GITHUB_ENV=/tmp/ENV
ENV GITHUB_OUTPUT=/tmp/OUT
ENV INTENTION_PATH=/app/iam-key-sync-intention.json

ENTRYPOINT [ "./mask-runner.sh", "./iam-key-sync-cron.sh" ]
