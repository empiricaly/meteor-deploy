import { ecs } from "@pulumi/aws";
import { ecs as ecsX, ecr as ecrX, lb as lbX } from "@pulumi/awsx";
import { getProgramVersion, JsonableObj } from "/src/utils";
import { getUrl } from "./routing";

type ContainerImage = ecsX.Image | string;

export function createAppImage(
  context: string,
  { repository }: ecrX.Repository
): ContainerImage {
  return ecsX.Image.fromDockerBuild(repository, {
    context,
    args: {
      NODE_VERSION: getProgramVersion(
        "meteor --allow-superuser node --version",
        { cwd: context }
      ),
      METEOR_VERSION: getProgramVersion("meteor --allow-superuser --version", {
        cwd: context,
      }),
    },
    cacheFrom: true,
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
    rootUrl?: string;
    meteorSettings?: JsonableObj;
    env?: { name: string; value: string }[];
  },
  {
    databaseContainerName = "database",
    alb,
  }: {
    databaseContainerName: string;
    alb: lbX.ApplicationListener;
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
        value: alb.endpoint.port.apply((port) => port.toString()),
      },
      {
        name: "ROOT_URL",
        value: rootUrl || getUrl(alb),
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
