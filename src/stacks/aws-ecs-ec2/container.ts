import { Input } from "@pulumi/pulumi";
import { ecs } from "@pulumi/aws";
import { ecs as ecsX, ecr as ecrX } from "@pulumi/awsx";
import { getProgramVersion, JsonableObj } from "/src/utils";
import { ApplicationListenerForTargetGroup } from "./routing";

type ContainerImage = ecsX.Image | string;

export function createAppImage(
  context: string,
  { repository }: ecrX.Repository
): ContainerImage {
  return ecsX.Image.fromDockerBuild(repository, {
    context,
    args: {
      NODE_VERSION: getProgramVersion("meteor node --version", {
        cwd: context,
      }),
      METEOR_VERSION: getProgramVersion("meteor --version", {
        cwd: context,
      }),
    },
  });
}

export function createAppContainer(
  image: ContainerImage,
  {
    memory,
    rootUrl,
    meteorSettings,
    env = [],
  }: {
    memory: number;
    rootUrl: Input<string>;
    meteorSettings?: JsonableObj;
    env?: { name: string; value: string }[];
  },
  {
    databaseContainerName = "database",
    alb,
  }: {
    databaseContainerName: string;
    alb: ApplicationListenerForTargetGroup;
  }
): ecsX.Container {
  return {
    memory,
    image,
    environment: [
      {
        name: "MONGO_URL",
        value: `mongodb://${databaseContainerName}:27017/meteor`,
      },
      {
        name: "PORT",
        value: alb.defaultTargetGroup.targetGroup.port.apply(
          (port) => `${port}`
        ),
      },
      {
        name: "ROOT_URL",
        value: rootUrl,
      },
      {
        name: "METEOR_SETTINGS",
        value: meteorSettings ? JSON.stringify(meteorSettings) : "",
      },
      ...env,
    ],
    dependsOn: [
      {
        condition: "START",
        containerName: databaseContainerName,
      },
    ],
    links: [databaseContainerName],
    portMappings: [alb],
  };
}

export function createDbImage(mongoTag: string): ContainerImage {
  return `mongo:${mongoTag}`;
}

export function createDbContainer(
  image: ContainerImage,
  { memory }: { memory: number },
  mountPoints: ecs.MountPoint[]
): ecsX.Container {
  return {
    memory,
    image,
    mountPoints,
  };
}
