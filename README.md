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
1. [Node JS](https://nodejs.dev) - meteor-deploy requires a separate node-js installation, because meteor's inbuilt nodejs version is out of date. [How to install nodejs](https://nodejs.dev/how-to-install-nodejs)
1. [Docker](https://docker.io) - meteor-deploy instructs pulumi to build a docker image. For this you need to [install docker](https://www.docker.com/get-started).

You will also need an up-to-date version of meteor installed.

### Deploy your project

Install `@empirica/meteor-deploy` through npm, by running the following command in your meteor projects' directory.

```bash
meteor npm install --save-dev @empirica/meteor-deploy -y
```

Enable your project for deployments with default configuration:

```bash
npx meteor-deploy init my-deployment-project
```

Execute the deployment to your cloud:

```bash
npx meteor-deploy pulumi up
```

### Update deployment with new versions of your meteor project

After making changes to your meteor project, you can update your deployment simply through pulumi:

```
npx meteor-deploy pulumi up
```

### Update with new versions of `@empirica/meteor-deploy`

Occasionally `@empirica/meteor-deploy` will issue new releases of the tool that might improve upon your infrastructure.

When a new release is available, run the following commands to update your deployment accordingly:

```bash 
meteor npm update @empirica/meteor-deploy
npx meteor-deploy init
meteor npm install
npx meteor-deploy pulumi up
```

### Advanced Configuration

Most configuration options can be directly configured (and automatically validated by through meteor-deploy). 

See:
```bash 
npx meteor-deploy stack configure aws-ecs-ec2 --help
```

#### Upgrade to a more powerful EC2 instance type

By default, meteor-deploy will use t2.micro instances. These are not very powerful. To upgrade the instance type
run: 

```bash
npx meteor-deploy stack configure aws-ecs-ec2 --instanceType t2.medium --app:memory: 1024 --db:memory: 1024
npx meteor-deploy pulumi up
```

#### Enable HTTPS

Enabling transport encryption through HTTPS is highly recommended. You first need to create a certificate on the 
[AWS Certificate manager (ACM)](https://aws.amazon.com/certificate-manager/). 

For this you have three possible options:

* [Request a public certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html), if your domain is public.
* [Request a private certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-private.html), for private domains 
* [Import your own certificate](https://docs.aws.amazon.com/acm/latest/userguide/import-certificate-api-cli.html), if you already have a certificate that you can use.

Once your certificate is ready on ACM, copy its ARN and add it to the configuration:

```bash 
npx meteor-deploy pulumi config set --path https.certificateArn <paste your certificate arn>
npx meteor-deploy pulumi config set --path domain.name mydomain.example.com
npx meteor-deploy pulumi up
```

You will need to manually create CNAME Record for your domain mydomain.example.com your DNS. 

#### Automatically create CNAME entries for your domain through AWS Route53

If your domain is hosted on [AWS Route53](https://aws.amazon.com/route53/), then meteor-deploy can add the CNAME entry for you. 
Simply copy and paste your Route53 ZoneID like this:

```
npx meteor-deploy pulumi config set --path domain.name mydomain
npx meteor-deploy pulumi config set --path domain.zoneId <paste your zone id here>
npx meteor-deploy pulumi up
```

Note that when setting `domain.zoneId`, `domain.name` needs to be the name of the subdomain of the domain that the zone id refers to.

If no zone-id is set then `domain.name` needs to be a fully qualified domain name.


#### SSH Access

You can access EC2 instances that host the service through SSH. To enable SSH access you need a setup a ssh key.

Given a public ssh key at `~/.ssh/id_rsa.pub`, add it to your stack:

```bash 
npx meteor-deploy pulumi config set publicKey "$(cat ~/.ssh/id_rsa.pub)"
npx meteor-deploy pulumi up
```

Find your deployed cluster at https://console.aws.amazon.com/ecs/home and then open "ECS Instances". 
Click on the EC2 instance link in the table of running instances and look for it's ip domain alias to ssh into.

```bash 
ssh ec2-user@<ec2 instance>
```
