@empirica/meteor-deploy
=======================
**(Work in Progress!)** 

A simple tool to facilitate deploying meteor projects to the cloud for production.

## _What_ is @empirica/meteor-deploy?

`@empirica/meteor-deploy` is yet another production deployment tool for [meteor](https://meteor.com) projects. 

It has been specifically tailored to deploy [empirica.ly](https://empirica.ly) experiments, however it can also be used for other projects.

`@empirica/meteor-deploy` uses [docker](https://docker.com) containers and [pulumi](https://pulumi.com) templates facilitate deployments to your own cloud account (currently only AWS is supported). 

## _Why_ do we need @empirica/meteor-deploy?

There are plenty of alternative ways to deploy meteor projects for production:

 * [Meteor Galaxy](https://www.meteor.com/hosting) - Meteor's commercial hosting offering
 * [Meteor Up](http://meteor-up.com/) - A powerful open-source tool that deploys a meteor projects into docker containers.

For Meteor projects such as Empirica, Meteor's Galaxy hosting does not offer compute instances with sufficient CPU and Memory to allow for optimal performance. For most meteor projects that is not problem as Galaxy is excellent at facilitating horizontal scalability, however Empirica projects do not support that.

`@empirica/meteor-deploy`, just like Meteor Up allows you to deploy your own MongoDB instance, so that you don't have to run use a professional MongoDB hosting service.

`@empirica/meteor-deploy` creates all the infrastructure resources that you need on the cloud, so you don't have to spend time configuring infrastructure and deploying updates to it. When using Meteor Up you would still need to go through some cumbersome steps to deploy your docker-containers to the cloud.

However if you do need production grade database-hosting (with full back-up solutions and scalability) and if you need your application deployment to scale horizontally, `@empirica/meteor-deploy` may not be the right tool for you.
 
## _How_ to use @empirica/meteor-deploy?

### Pre-requisites

Before we begin you need to do the following:

1. [Meteor](https://meteor.com) - If you haven't done this already, you will need to [install meteor](https://www.meteor.com/install).
1. [Pulumi](https://www.pulumi.com) - To install, follow [these instructions](https://www.pulumi.com/docs/get-started/aws/install-pulumi/).
1. For deployments to the AWS cloud please follow [the instructions here](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).
1. [Node JS](https://nodejs.dev) - meteor-deploy requires a separate node-js installation, because meteor's inbuilt nodejs version is out of date. [How to install nodejs](https://nodejs.dev/how-to-install-nodejs)
1. [Docker](https://docker.io) - meteor-deploy instructs pulumi to build a docker image. For this you need to [install docker](https://www.docker.com/get-started).

You will also need an up-to-date version of meteor installed.

### Install

Finally, install `@empirica/meteor-deploy` through npm, by running the following command in your meteor projects' directory.

```bash
meteor npm install --save-dev @empirica/meteor-deploy -y
```

### Create a deployment project

Now enable your meteor projects for deployments using `@empirica/meteor-deploy`:

```bash
npx meteor-deploy init --description "This is meteor deployment project"
```

This will install some configuration files to allow you to push infrastructure through pulumi. 

Make sure to install newly require NPM packages.

```bash 
meteor npm install
```

### Configure a deployment stack

With the newly created deployment, create select a new pulumi deployment stack:

```bash
pulumi stack select -c dev
```

Now we can add some configuration to the selected stack:

```bash 
npx meteor-deploy stack configure aws-ecs-ec2 --instanceType t2.medium
```

For more configuration options check:

```bash 
npx meteor-deploy stack configure aws-ecs-ec2 --help
```

### Deploy 

We are now ready deploy your project to the cloud

```bash
pulumi up
```

#### Update deployment with new versions of your meteor project

After making changes to your meteor project, you can update your deployment simply through pulumi:

```
pulumi up
```

#### Update with new versions of `@empirica/meteor-deploy`

Occasionally `@empirica/meteor-deploy` will issue new releases of the tool that might improve upon your infrastructure.

When a new release is available, run the following commands to update your deployment accordingly:

```bash 
meteor npm update @empirica/meteor-deploy
npx meteor-deploy init
meteor npm install
pulumi up
```

## Setup for Development

If you are developing `@empirica/meteor-deploy`, run `npm link` and use the `--developmentMode` flag when initializing your deployment project:

```bash
npx meteor-deploy init --developmentMode
```

This will create symbolic links instead of one-of file-dumps, which is ideal for when you are making frequent changes to the `@empirica/meteor-deploy` package.

