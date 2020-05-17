import { efs, ecs, iam, ebs } from "@pulumi/aws";
import { ec2 } from "@pulumi/awsx";
import { deviceName } from "/src/utils/device-name";
import { ec2 as ec2Input, ecs as ecsInput } from "@pulumi/aws/types/input";
import { output } from "@pulumi/pulumi";

export type StorageType = "efs" | "ebs";
export type PersistentStorageType = "rexray";

interface VolumeBase<Container extends string> {
  name: string;
  mountPoints: {
    container: Container;
    containerPath: string;
  }[];
}

export interface EfsVolume<Container extends string>
  extends VolumeBase<Container> {
  efsFileSystem: efs.FileSystem;
  blockDevice: undefined;
}

export interface BlockStorageVolume<Container extends string>
  extends VolumeBase<Container> {
  blockDevice: {
    dockerVolumeConfiguration: ecsInput.TaskDefinitionVolumeDockerVolumeConfiguration;
    ebsBlockDevice: ec2Input.LaunchConfigurationEbsBlockDevice;
    persistentStorageType: PersistentStorageType;
  };

  efsFileSystem: undefined;
}

export type VolumeDefinition<Container extends string> =
  | EfsVolume<Container>
  | BlockStorageVolume<Container>;

export function isEfsVolume<Container extends string>(
  volume: VolumeDefinition<Container>
): volume is EfsVolume<Container> {
  return volume.efsFileSystem !== undefined;
}

export function isBlockStorageVolume<Container extends string>(
  volume: VolumeDefinition<Container>
): volume is BlockStorageVolume<Container> {
  return volume.blockDevice !== undefined;
}

export function getMountPointsForContainer<Container extends string>(
  volumes: VolumeDefinition<string>[],
  targetContainer: Container
): ecs.MountPoint[] {
  return volumes.reduce(
    (collector: ecs.MountPoint[], { name: sourceVolume, mountPoints }) => {
      collector.push(
        ...mountPoints
          .filter(({ container }) => container === targetContainer)
          .map(({ containerPath }) => ({
            sourceVolume,
            containerPath,
          }))
      );
      return collector;
    },
    []
  );
}

export type DatabaseVolumeName = "db" | "configdb";

function databaseVolumes(): (VolumeBase<"database"> & {
  name: DatabaseVolumeName;
})[] {
  // XXX ideally we should lookup the volumes that the selected mongodb docker image uses, instead of hard-coding it.
  return [
    {
      name: "db",
      mountPoints: [
        {
          container: "database",
          containerPath: "/data/db",
        },
      ],
    },
    {
      name: "configdb",
      mountPoints: [
        {
          container: "database",
          containerPath: "/data/configdb",
        },
      ],
    },
  ];
}

const iamStatementsByDriver: Record<
  PersistentStorageType,
  () => iam.PolicyStatement[]
> = {
  rexray() {
    return [
      {
        Action: [
          "ec2:AttachVolume",
          "ec2:CreateVolume",
          "ec2:CreateSnapshot",
          "ec2:CreateTags",
          "ec2:DeleteVolume",
          "ec2:DeleteSnapshot",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInstances",
          "ec2:DescribeVolumes",
          "ec2:DescribeVolumeAttribute",
          "ec2:DescribeVolumeStatus",
          "ec2:DescribeSnapshots",
          "ec2:CopySnapshot",
          "ec2:DescribeSnapshotAttribute",
          "ec2:DetachVolume",
          "ec2:ModifySnapshotAttribute",
          "ec2:ModifyVolumeAttribute",
          "ec2:DescribeTags",
        ],
        Effect: "Allow",
        Resource: "*",
        // TODO add condition to only allow volumes it needs.
      },
    ];
  },
};

export function createDriverPolicy(
  name: string,
  driver: PersistentStorageType,
  role: iam.Role
): iam.RolePolicy | null {
  const statements = iamStatementsByDriver[driver]();

  return statements.length > 0
    ? new iam.RolePolicy(name, {
        role,
        policy: {
          Version: "2012-10-17",
          Statement: statements,
        },
      })
    : null;
}

export function createDatabaseBlockStorageVolumes(
  resourcePrefix: string,
  volumeSizes: Record<string, number | undefined> = {}
): BlockStorageVolume<"database">[] {
  const kmsKeyId = output(ebs.getDefaultKmsKey()).apply(({ id }) => id);

  return databaseVolumes().map((volume, i) => {
    const volumeSize = volumeSizes[volume.name] || 10;
    return {
      blockDevice: {
        persistentStorageType: "rexray",
        dockerVolumeConfiguration: {
          driver: "rexray/ebs",
          driverOpts: {
            volumeType: "gp2",
            size: `${volumeSize}`,
            kmsKeyId,
          },
          autoprovision: true,
          scope: "shared",
        },
        ebsBlockDevice: {
          deleteOnTermination: false,
          deviceName: deviceName(i, "/dev/xvdb"),
          encrypted: true,
          volumeSize,
          volumeType: "gp2",
        },
      },
      efsFileSystem: undefined,
      ...volume,
    };
  });
}

export function createDatabaseEfsVolumes(
  resourcePrefix: string,
  { subnets, sg }: { subnets: ec2.Subnet[]; sg: ec2.SecurityGroup }
): EfsVolume<"database">[] {
  return databaseVolumes()
    .map(
      (volume): EfsVolume<"database"> => ({
        ...volume,
        efsFileSystem: new efs.FileSystem(
          `${resourcePrefix}-efs-${volume.name}`,
          {
            encrypted: true,
            performanceMode: "maxIO",
          }
        ),
        blockDevice: undefined,
      })
    )
    .map(({ name, efsFileSystem, ...props }) => ({
      name,
      efsFileSystem,
      ...props,
      mountTargets: subnets.map(
        (subnet, index) =>
          new efs.MountTarget(`${resourcePrefix}-${name}-${index}`, {
            fileSystemId: efsFileSystem.id,
            subnetId: subnet.id,
            securityGroups: [sg.id],
          })
      ),
    }));
}

export function enableBlockStoragePluginScript({
  clusterName,
  region,
}: {
  clusterName: string;
  region: string;
}): string {
  return (
    "#!/bin/bash\n" +
    "set -e\n" +
    `echo ECS_CLUSTER="${clusterName}" >> /etc/ecs/ecs.config;\n` +
    "echo ECS_BACKEND_HOST= >> /etc/ecs/ecs.config;\n" +
    `docker plugin install rexray/ebs REXRAY_PREEMPT=true EBS_REGION=${region} --grant-all-permissions;\n` +
    "stop ecs;\n" +
    "start ecs;\n"
  );
}
