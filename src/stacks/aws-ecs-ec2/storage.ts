import { efs, ecs } from "@pulumi/aws";
import { ec2 } from "@pulumi/awsx";

export type EfsVolumeDefinition = {
  name: string;
  fileSystem: efs.FileSystem;
  mountPoints: {
    container: string;
    containerPath: string;
  }[];
};

export function getMountPointsForContainer(
  volumes: EfsVolumeDefinition[],
  targetContainer: string
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

export function createDatabaseEfsVolumes(
  projectName: string,
  { subnets, sg }: { subnets: ec2.Subnet[]; sg: ec2.SecurityGroup }
): EfsVolumeDefinition[] {
  // XXX ideally we should lookup the volumes that the selected mongodb docker image uses, instead of hard-coding it.
  return [
    {
      name: "db",
      fileSystem: new efs.FileSystem(`${projectName}-efs-db`, {
        encrypted: true,
        performanceMode: "maxIO",
      }),
      mountPoints: [
        {
          container: "database",
          containerPath: "/data/db",
        },
      ],
    },
    {
      name: "configdb",
      fileSystem: new efs.FileSystem(`${projectName}-efs-configdb`, {
        encrypted: true,
      }),
      mountPoints: [
        {
          container: "database",
          containerPath: "/data/configdb",
        },
      ],
    },
  ].map(({ name, fileSystem, ...props }) => ({
    name,
    fileSystem,
    ...props,
    mountTargets: subnets.map(
      (subnet, index) =>
        new efs.MountTarget(`${projectName}-${name}-${index}`, {
          fileSystemId: fileSystem.id,
          subnetId: subnet.id,
          securityGroups: [sg.id],
        })
    ),
  }));
}
