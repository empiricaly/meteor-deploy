import { ec2, ecs, autoscaling } from "@pulumi/awsx";
import { Config } from "./config";
import { output, Input } from "@pulumi/pulumi";
import {
  PersistentStorageType,
  BlockStorageVolume,
  createDriverPolicy,
  enableBlockStoragePluginScript,
  VolumeDefinition,
} from "./storage";
import { getRegion, iam } from "@pulumi/aws";
import { createIamInstanceProfile } from "./permission";

export function createCluster(
  projectName: string,
  options?: ecs.ClusterArgs
): ecs.Cluster {
  return new ecs.Cluster(`${projectName}-ecs-cluster`, options);
}

export function createAutoScalingInstanceProfile(
  resourcePrefix: string,
  driverPermissions: PersistentStorageType[]
): iam.InstanceProfile {
  const role = new iam.Role(`${resourcePrefix}-role`, {
    assumeRolePolicy: autoscaling.AutoScalingLaunchConfiguration.defaultInstanceProfilePolicyDocument(),
  });

  const driverPolicies = driverPermissions
    .map((driver) =>
      createDriverPolicy(`${resourcePrefix}-policy-${driver}`, driver, role)
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
    ebsVolumes = [],
    region = output(getRegion()).apply(({ name }) => name),
  }: {
    instanceType: Config["instanceType"];
    vpc: ec2.Vpc;
    subnets: ec2.Subnet[];
    keyName?: Input<string>;
    ebsVolumes?: BlockStorageVolume<string>[];
    region?: Input<string>;
  }
): autoscaling.AutoScalingGroup {
  let userData;

  if (ebsVolumes.length > 0) {
    userData = output({
      clusterName: cluster.cluster.name,
      region,
    }).apply(enableBlockStoragePluginScript);
  }

  const instanceProfile = createAutoScalingInstanceProfile(
    `${resourcePrefix}-instance-profile`,
    Array.from(
      new Set(
        ebsVolumes.map(({ blockDevice }) => blockDevice.persistentStorageType)
      )
    )
  );

  const ag = cluster.createAutoScalingGroup(`${resourcePrefix}-asg`, {
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
      ebsBlockDevices: ebsVolumes.map(
        ({ blockDevice }) => blockDevice.ebsBlockDevice
      ),
      userData,
      instanceProfile,
    },
  });

  autoscaling.AutoScalingLaunchConfiguration.defaultInstanceProfilePolicyDocument();

  return ag;
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
        })
      ),
      containers,
    },
  });
}
