import { ebs, efs, ecs, iam } from "@pulumi/aws";
import { ec2 } from "@pulumi/awsx";
import { ecs as ecsInput } from "@pulumi/aws/types/input";
import { PolicyStatement } from "@pulumi/aws/iam";
import { Input } from "@pulumi/pulumi";
import {
  deviceName,
  removeIndent,
  requireExperimentalModeForFeature,
} from "/src/utils";

export type StorageType = "efs" | "ebs-rexray" | "ebs";

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
    dockerVolumeConfiguration?: ecsInput.TaskDefinitionVolumeDockerVolumeConfiguration;
    hostPath?: string;
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

const storageType: Record<
  StorageType,
  {
    policyStatement(): iam.PolicyStatement[];
  }
> = {
  efs: {
    policyStatement(): PolicyStatement[] {
      return [];
    },
  },

  ebs: {
    policyStatement(): PolicyStatement[] {
      return [
        {
          Effect: "Allow",
          Action: "ec2:AttachVolume",
          Resource: "*", //TODO constrain to single ARN.
        },
      ];
    },
  },
  "ebs-rexray": {
    policyStatement(): PolicyStatement[] {
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
  },
};

export function createPolicyForStorageAccess(
  name: string,
  type: StorageType,
  role: iam.Role
): iam.RolePolicy | null {
  const statements = storageType[type].policyStatement();

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

export function createDatabaseRexrayStorageVolumes(
  resourcePrefix: string,
  volumeSizes: Record<string, number | undefined> = {}
): BlockStorageVolume<"database">[] {
  requireExperimentalModeForFeature("Storage type 'ebs-rexray'");
  return databaseVolumes().map((volume) => {
    const volumeSize = volumeSizes[volume.name] || 10;
    return {
      blockDevice: {
        dockerVolumeConfiguration: {
          driver: "rexray/ebs",
          driverOpts: {
            volumeType: "gp2",
            size: `${volumeSize}`,
          },
          autoprovision: true,
          scope: "shared",
        },
      },
      efsFileSystem: undefined,
      ...volume,
    };
  });
}

export function createDatabaseLocalStorageVolumes(
  resourcePrefix: string,
  path: string
): BlockStorageVolume<"database">[] {
  return databaseVolumes().map((volume) => {
    return {
      blockDevice: {
        hostPath: `${path}/${volume.name}`,
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
  requireExperimentalModeForFeature("Storage type 'efs'");
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

export function installRexrayScript({
  clusterName,
  region,
}: {
  clusterName: string;
  region: string;
}): string {
  requireExperimentalModeForFeature("Storage type 'ebs-rexray'");

  return removeIndent(`
    #!/bin/bash
    set -e
    echo ECS_CLUSTER="${clusterName}" >> /etc/ecs/ecs.config
    echo ECS_BACKEND_HOST= >> /etc/ecs/ecs.config
    docker plugin install rexray/ebs REXRAY_PREEMPT=true EBS_REGION=${region} --grant-all-permissions
    stop ecs
    start ecs
  `);
}

export function createEbsVolume(
  name: string,
  {
    size,
    availabilityZone,
    snapshotId,
  }: { size?: number; availabilityZone: Input<string>; snapshotId?: string }
): ebs.Volume {
  return new ebs.Volume(
    name,
    {
      encrypted: true,
      type: "gp2",
      availabilityZone,
      size,
      snapshotId,
    },
    {
      protect: true,
    }
  );
}

export function mountLocalFileSystemScript({
  clusterName,
  mountPoint,
  ebsVolumeId,
  region,
  devicePath = deviceName(0, "/dev/xvddb"),
  fsFormat = "xfs",
}: {
  clusterName: string;
  mountPoint: string;
  ebsVolumeId: string;
  region: string;
  devicePath?: string;
  fsFormat?: string;
}) {
  const fstab = `${devicePath}  ${mountPoint}  ${fsFormat}  defaults,nofail  0  0`;

  function describeVolume(query: string): string {
    return `/usr/bin/aws ec2 describe-volumes --region "${region}" --volume-id "${ebsVolumeId}" --query "${query}" --output text`;
  }

  function deviceIsEmpty() {
    return `"$(file -s "${devicePath}")" = "${devicePath}: data"`;
  }

  return (
    removeIndent(`
      #!/bin/bash
      set -e
      echo ECS_CLUSTER="${clusterName}" >> /etc/ecs/ecs.config;
      echo ECS_BACKEND_HOST= >> /etc/ecs/ecs.config;
      instanceId=$(curl http://169.254.169.254/latest/meta-data/instance-id)
      
      if ! blkid "${devicePath}"; then
        yum install aws-cli -y
        
        # Wait for ebs volume to become available, in case it is already attached to another instance.
        >&2 echo "Waiting for EBS Volume to become available..."
        if [[ "$(${describeVolume(
          "Volumes[0].Attachments[0].InstanceId"
        )})" != "$instanceId" ]]; then
          /usr/bin/aws ec2 wait volume-available --volume-id "${ebsVolumeId}" --region "${region}"
        fi
          
        # Attach EBS volume to current instance
        /usr/bin/aws ec2 attach-volume --device "${devicePath}" --instance-id "$instanceId" --volume-id "${ebsVolumeId}" --region "${region}"
        
        >&2 printf "Waiting for EBS volume to be attached."
        until [ "$(${describeVolume(
          "Volumes[0].Attachments[0].State"
        )})" = attached ]; do
          sleep 5
          >&2 printf .
        done
        
        >&2 echo ".. Done"
      fi
      
      if [[ ${deviceIsEmpty()} ]]; then
       >&2 echo "Formatting new EBS device at ${devicePath}..."
       mkfs -t "${fsFormat}" "${devicePath}"
      fi
      
      mkdir -p "${mountPoint}"
      chattr +i "${mountPoint}"
      if ! grep -q "${fstab}" "/etc/fstab" ; then
       echo "${fstab}" >> /etc/fstab
       mount -a
      fi
  `).trim() + "/n"
  );
}
