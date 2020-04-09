import { ec2, ecs, autoscaling } from "@pulumi/awsx";
import { Config } from "./config";
import { Output } from "@pulumi/pulumi";
import { EfsVolumeDefinition } from "./storage";

export function createCluster(
  projectName: string,
  options?: ecs.ClusterArgs
): ecs.Cluster {
  return new ecs.Cluster(`${projectName}-ecs-cluster`, options);
}

export function createAutoScalingGroup(
  projectName: string,
  cluster: ecs.Cluster,
  {
    instanceType,
    vpc,
    subnets,
    keyName,
  }: {
    instanceType: Config["instanceType"];
    vpc: ec2.Vpc;
    subnets: ec2.Subnet[];
    keyName?: Output<string>;
  }
): autoscaling.AutoScalingGroup {
  return cluster.createAutoScalingGroup(`${projectName}-asg`, {
    vpc,
    subnetIds: subnets.map(({ subnet }) => subnet.id),
    templateParameters: {
      minSize: 0,
      maxSize: 2,
      desiredCapacity: 1,
    },
    launchConfigurationArgs: {
      instanceType,
      keyName,
      associatePublicIpAddress: true,
    },
  });
}

export function createService(
  projectName: string,
  {
    cluster,
    volumes,
    containers,
  }: {
    cluster: ecs.Cluster;
    containers: Record<string, ecs.Container>;
    volumes: EfsVolumeDefinition[];
  }
): ecs.EC2Service {
  return new ecs.EC2Service(`${projectName}-ecs-service`, {
    os: "linux",
    deploymentMaximumPercent: 100,
    deploymentMinimumHealthyPercent: 0,
    cluster,
    waitForSteadyState: false,
    taskDefinitionArgs: {
      networkMode: "bridge", // EFS does not support awsvpc
      volumes: volumes.map(({ name, fileSystem }) => ({
        name,
        efsVolumeConfiguration: {
          fileSystemId: fileSystem.id,
        },
      })),
      containers,
    },
  });
}
