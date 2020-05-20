import { ec2, ecs, autoscaling } from "@pulumi/awsx";
import { Config } from "./config";
import { ComponentResourceOptions, Input } from "@pulumi/pulumi";
import {
  createPolicyForStorageAccess,
  StorageType,
  VolumeDefinition,
} from "./storage";
import { iam } from "@pulumi/aws";
import { createIamInstanceProfile } from "./permission";

export function createCluster(
  projectName: string,
  options?: ecs.ClusterArgs
): ecs.Cluster {
  return new ecs.Cluster(`${projectName}-ecs-cluster`, options);
}

export function createAutoScalingInstanceProfile(
  resourcePrefix: string,
  storageTypes: StorageType[]
): iam.InstanceProfile {
  const role = new iam.Role(`${resourcePrefix}-role`, {
    assumeRolePolicy: autoscaling.AutoScalingLaunchConfiguration.defaultInstanceProfilePolicyDocument(),
  });

  const driverPolicies = storageTypes
    .map((storageType) =>
      createPolicyForStorageAccess(
        `${resourcePrefix}-policy-${storageType}`,
        storageType,
        role
      )
    )
    .filter((policy) => policy !== null) as iam.RolePolicy[];

  return createIamInstanceProfile(resourcePrefix, role, [
    ...autoscaling.AutoScalingLaunchConfiguration.defaultInstanceProfilePolicyARNs(),
    ...driverPolicies,
  ]);
}

export function createAutoScalingGroup(
  resourcePrefix: string,
  cluster: ecs.Cluster,
  {
    instanceType,
    vpc,
    subnets,
    keyName,
    userData,
    instanceProfile,
  }: {
    instanceType: Config["instanceType"];
    vpc: ec2.Vpc;
    subnets: ec2.Subnet[];
    keyName?: Input<string>;
    userData?: Input<string>;
    instanceProfile?: iam.InstanceProfile;
  },
  opts?: ComponentResourceOptions
): autoscaling.AutoScalingGroup {
  return cluster.createAutoScalingGroup(
    `${resourcePrefix}-asg`,
    {
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
        // Some versions of pulumi seem to handle undefined as "keep unset" instead of "use default", so need to use
        // void instead.
        ...(userData ? { userData } : {}),
        ...(instanceProfile ? { instanceProfile } : {}),
      },
    },
    opts
  );
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
    volumes: VolumeDefinition<string>[];
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
      volumes: volumes.map(
        ({ name, efsFileSystem, blockDevice }: VolumeDefinition<string>) => ({
          name,
          efsVolumeConfiguration: efsFileSystem && {
            fileSystemId: efsFileSystem.id,
          },
          dockerVolumeConfiguration:
            blockDevice && blockDevice.dockerVolumeConfiguration,
          hostPath: blockDevice?.hostPath,
        })
      ),
      containers,
    },
  });
}
