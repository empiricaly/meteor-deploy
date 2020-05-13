ARG METEOR_VERSION=1.10.2
ARG NODE_VERSION=13.11.0
ARG NVM_VERSION=0.35.3
ARG METEOR_PROJECT_PATH=examples/leaderboard
ARG USERNAME=meteor-deploy
ARG GROUPNAME=$USERNAME
ARG PULUMI_PROJECT_NAME

FROM empiricaly/meteor:$METEOR_VERSION as meteor-docker
RUN apt-get install -y software-properties-common
RUN set -e; \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1 apt-key add - ; \
    add-apt-repository \
       "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
       $(lsb_release -cs) \
       stable"; \
    apt-get update; \
    apt-get install -y docker-ce docker-ce-cli containerd.io

RUN docker --version

FROM meteor-docker as meteor-with-user

SHELL ["/bin/bash", "-c"]

ARG USERNAME
ENV HOME "/home/$USERNAME"
ARG GROUPNAME

RUN set -ex; \
    groupadd "$GROUPNAME"; \
    useradd -g "$GROUPNAME" -d "$HOME" -ms /bin/bash  "$USERNAME"; \
    usermod -aG docker $USERNAME

RUN set -ex; \
    cp -r /root/.meteor "$HOME/."; \
    chown -R $USERNAME:$GROUPNAME "$HOME/.meteor"

USER $USERNAME
WORKDIR $HOME

ARG METEOR_VERSION
RUN meteor --release "$METEOR_VERSION" --version

FROM meteor-with-user as meteor-nvm
ENV NVM_DIR "$HOME/.nvm"
ARG NODE_VERSION
RUN mkdir "$NVM_DIR"

# Install nvm with node and npm
ARG NVM_VERSION
RUN curl "https://raw.githubusercontent.com/creationix/nvm/v$NVM_VERSION/install.sh" | bash;
RUN . $NVM_DIR/nvm.sh; \
    set -e; \
    nvm install $NODE_VERSION; \
    nvm alias default $NODE_VERSION; \
    nvm use default

ENV NODE_PATH   $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH        $NVM_DIR/v$NODE_VERSION/bin:$PATH

RUN . $NVM_DIR/nvm.sh && nvm --version

FROM meteor-nvm as meteor-nvm-pulumi
RUN curl -fsSL https://get.pulumi.com | bash

ENV PULUMI_PATH $HOME/.pulumi/bin
ENV PATH        $PATH:$PULUMI_PATH

RUN pulumi version

FROM meteor-nvm-pulumi as local-meteor-deploy

ARG USERNAME
ARG GROUPNAME
# XXX --chown doesn't support dynamic arguments, yet.
#COPY --chown=$USERNAME:$GROUPNAME . meteor-deploy
COPY . meteor-deploy
USER root
RUN chown -R "$USERNAME:$GROUPNAME" "$HOME/meteor-deploy"
USER $USERNAME

WORKDIR $HOME/meteor-deploy

RUN . "$NVM_DIR/nvm.sh"; \
    set -ex; \
    npm install; \
    npm run build:js; \
    npm link

FROM local-meteor-deploy as meteor-project
WORKDIR $HOME

ARG METEOR_PROJECT_PATH
ARG USERNAME
ARG GROUPNAME
# XXX --chown doesn't support dynamic arguments, yet.
#ADD --chown=$USERNAME:$GROUPNAME $METEOR_PROJECT_URL meteor-project
ADD $METEOR_PROJECT_PATH meteor-project
USER root
RUN chown -R $USERNAME:$GROUPNAME meteor-project
USER $USERNAME

WORKDIR $HOME/meteor-project

RUN . "$NVM_DIR/nvm.sh"; \
 set -ex; \
 npm install -D "file://$HOME/meteor-deploy"

ARG PULUMI_PROJECT_NAME

RUN . "$NVM_DIR/nvm.sh"; \
    set -e; \
    npx meteor-deploy init $PULUMI_PROJECT_NAME; \
    npm install

FROM meteor-project

#VOLUME $HOME/.pulumi
#ENV PULUMI_PATH $HOME/.pulumi/bin
#ENV PATH        $PATH:$PULUMI_PATH

# FIXME entrypoint attempts to launch docker and then run CMD as $USERNAME, but interactive shell doesn't work
# https://stackoverflow.com/questions/61732140
# FIXME Docker in docker builds, invoked by pulumi are failing.
COPY container-helpers/entrypoint.sh .
USER root
ENV ENTRYUSER $USERNAME
ENTRYPOINT [ "./entrypoint.sh" ]
CMD "pulumi up"
