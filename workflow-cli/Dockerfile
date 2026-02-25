FROM node:lts-alpine

RUN apk add --no-cache curl bash jq

# Build workflow-cli
# NOTE: build context must be the repo root:
#   docker build -f workflow-cli/Dockerfile -t iam-key-sync .
WORKDIR /workflow-cli
COPY workflow-cli/package*.json ./
RUN npm ci
COPY workflow-cli/ ./
RUN npm run build

RUN mkdir /app
WORKDIR /app

COPY iam-key-sync/src/app /app
COPY --chmod=666 iam-key-sync/src/ENV /tmp/ENV

ENV GITHUB_ENV=/tmp/ENV
ENV GITHUB_OUTPUT=/tmp/OUT

ENTRYPOINT [ "./mask-runner.sh", "./iam-key-sync-cron.sh" ]
