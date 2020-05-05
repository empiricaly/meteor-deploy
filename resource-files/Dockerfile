ARG METEOR_VERSION=latest
ARG NODE_VERSION=latest

# Stage 0:
# Use meteor executable to build production bundle.

FROM empiricaly/meteor:$METEOR_VERSION AS builder

WORKDIR /usr/local/meteor-src
COPY . .
RUN meteor npm --allow-superuser install --only production
RUN meteor build --allow-superuser --directory /usr/local/meteor-app
WORKDIR /usr/local/meteor-app/bundle/programs/server
RUN meteor npm --release "$METEOR_VERSION" install
RUN meteor npm --release "$METEOR_VERSION" --allow-superuser install --save bcrypt

# Stage 1:
# Deploy production bundle on nodejs server
FROM node:$NODE_VERSION

WORKDIR /usr/local/meteor-app
COPY --from=0 /usr/local/meteor-app/bundle .

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
