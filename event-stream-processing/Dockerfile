FROM node:24-alpine

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN npm ci
RUN npm i --location=global @nestjs/cli

EXPOSE 3000

CMD ["npm", "start"]
