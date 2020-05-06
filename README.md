meteor-impact
=============
**(Work in Progress!)** 

A simple tool to facilitate deploying meteor projects to the cloud for production.

## _What_ is meteor-impact?

`meteor-impact` is yet another production deployment tool for [meteor](https://meteor.com) projects. 

It has been specifically tailored to deploy [empirica.ly](https://empirica.ly) experiments, however it can also be used for other projects.

`meteor-impact` uses [docker](https://docker.com) containers and [pulumi](https://pulumi.com) templates facilitate deployments to your own cloud account (currently only AWS is supported). 

## _Why_ do we need meteor-impact?

There are plenty of alternative ways to deploy meteor projects for production:

 * [Meteor Galaxy](https://www.meteor.com/hosting) - Meteor's commercial hosting offering
 * [Meteor Up](http://meteor-up.com/) - A powerful open-source tool that deploys a meteor projects into docker containers.

For Meteor projects such as Empirica, Meteor's Galaxy hosting does not offer compute instances with sufficient CPU and Memory to allow for optimal performance. For most meteor projects that is not problem as Galaxy is excellent at facilitating horizontal scalability, however Empirica projects do not support that.

`meteor-impact`, just like Meteor Up allows you to deploy your own MongoDB instance, so that you don't have to run use a professional MongoDB hosting service.

`meteor-impact` creates all the infrastructure resources that you need on the cloud, so you don't have to spend time configuring infrastructure and deploying updates to it. When using Meteor Up you would still need to go through some cumbersome steps to deploy your docker-containers to the cloud.

However if you do need production grade database-hosting (with full back-up solutions and scalability) and if you need your application deployment to scale horizontally, `meteor-impact` may not be the right tool for you.
 
## _How_ to use meteor-impact?

### Pre-requisites

Before we begin you will install some essential tools that meteor-impact uses:

1. [pulumi](https://www.pulumi.com) - To install, follow [these instructions](https://www.pulumi.com/docs/get-started/aws/install-pulumi/).
1. [aws-cli](https://aws.amazon.com/cli/) - To install, follow the instructions on their website, or run `sudo apt-get install awscli` if you are using an ubuntu linux system.
1. [node-js](https://nodejs.com) - A separate node-js installation is needed, because meteor's inbuilt nodejs version is out of date.

You will also need an up-to-date version of meteor installed.

### Install

Finally, install `meteor-impact` through npm, by running the following command in your meteor projects' directory.

```bash
meteor npm install --save-dev meteor-impact -y
```

### Create a deployment project

Now enable your meteor projects for deployments using `meteor-impact`:

```bash
npx meteor-impact init --description "This is meteor deployment project"
```

This will install some configuration files to allow you to push infrastructure through pulumi. 

Make sure to install newly require NPM packages.

```bash 
meteor npm install
```

### Configure a deployment stack

With the newly created deployment, create new pulumi deployment stack:

```bash
pulumi stack init
```
This command will prompt you for name for your deployment stack.

Choose a suitable name for your stack. Ideally this name should be unique within the cloud-account that you are using.

When created make sure that the stack that you have created is also selected:

```bash
pulumi stack select
```

Now we can add some configuration to the selected stack:

```bash 
npx meteor-impact stack configure aws-ecs-ec2 --instanceType t2.medium
```

For more configuration options check:

```bash 
npx meteor-impact stack configure aws-ecs-ec2 --help
```

### Authorize access for your AWS Cloud account

Before we can start running deployments, we need to prepare the aws-cli to run the cloud.

For this you will need to set up an IAM user with full permissions to various AWS services. For security reasons it is recommended that you use separate AWS cloud account for each project. 

Once you have obtained an `API_KEY` and `API_SECRET` for that aws user run the following command to allow the aws-cli tool to access your cloud account:

```bash
aws-cli configure
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

#### Update with new versions of `meteor-impact`

Occasionally `meteor-impact` will issue new releases of the tool that might improve upon your infrastructure.

When a new release is available, run the following commands to update your deployment accordingly:

```bash 
meteor npm update meteor-impact
npx meteor-impact init
meteor npm install
pulumi up
```

## Setup for Development

If you are developing `meteor-impact`, run `npm link` and use the `--developmentMode` flag when initializing your deployment project:

```bash
npx meteor-impact init --developmentMode
```

This will create symbolic links instead of one-of file-dumps, which is ideal for when you are making frequent changes to the `meteor-impact` package.

