ARG METEOR_VERSION=latest
ARG NODE_VERSION=latest

# Stage 0:
# Use meteor executable to build production bundle.

FROM empiricaly/meteor:$METEOR_VERSION AS builder

ENV METEOR_ALLOW_SUPERUSER 1

WORKDIR /usr/local/meteor-src
COPY . .
RUN meteor npm install --only production
RUN meteor build --directory /usr/local/meteor-app --server-only
WORKDIR /usr/local/meteor-app/bundle/programs/server
RUN meteor npm install
RUN meteor npm install --save bcrypt

# Stage 1:
# Deploy production bundle on nodejs server
FROM node:$NODE_VERSION

WORKDIR /usr/local/meteor-app
COPY --from=builder /usr/local/meteor-app/bundle .

ENV BIND_IP ""
ENV DISABLE_WEBSOCKETS ""
ENV HTTP_FORWARDED_COUNT ""
ENV MAIL_URL ""
ENV METEOR_SETTINGS ""
ENV MONGO_URL ""
ENV MONGO_OPLOG_URL ""
ENV METEOR_PACKAGE_DIRS ""
ENV PORT ""
ENV ROOT_URL http://localhost

ENTRYPOINT exec node main.js
