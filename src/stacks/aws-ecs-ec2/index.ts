import { output } from "@pulumi/pulumi";
import { allowEfsAccess, createSecurityGroup, createVpc } from "./network";
import {
  createDatabaseEfsVolumes,
  getMountPointsForContainer,
} from "./storage";
import {
  createAutoScalingGroup,
  createCluster,
  createService,
} from "./compute";
import { createContainerRegistry } from "./deployment";
import {
  createAppContainer,
  createAppImage,
  createDbContainer,
  createDbImage,
} from "./container";
import { createKeyPair } from "./security";

import { Config } from "./config";
import { createApplicationListener, getUrl } from "./routing";
import { StackOutput } from "/src/stacks";
import { configureTags } from "./tags";
export * from "./config";

export const stackType = "aws-ecs-ec2";

export async function createStack(
  projectName: string,
  stackName: string,
  { publicKey, tags, disableProjectTags, ...config }: Config,
  { meteorDirectory = process.cwd() }: { meteorDirectory?: string } = {}
): Promise<StackOutput> {
  configureTags({
    disableProjectTags: disableProjectTags,
    optionsForProjectTags: { stackName, projectName },
    tags,
  });

  const resourcePrefix = `${projectName}-${stackName}`;
  const repo = createContainerRegistry(resourcePrefix);
  const vpc = createVpc(resourcePrefix);

  const [subnets, privateSubnets] = await Promise.all([
    vpc.publicSubnets,
    vpc.publicSubnets,
  ]);

  const sg = createSecurityGroup(resourcePrefix, { vpc });

  const databaseVolumes = createDatabaseEfsVolumes(resourcePrefix, {
    subnets: privateSubnets,
    sg,
  });

  const keyPair = publicKey && createKeyPair(resourcePrefix, publicKey);

  const cluster = createCluster(resourcePrefix, { vpc });

  const alb = createApplicationListener(resourcePrefix, { vpc });

  const databaseContainerName = "database";

  const appContainer = createAppContainer(
    createAppImage(meteorDirectory, repo),
    config.app,
    { alb, databaseContainerName }
  );

  const dbContainer = createDbContainer(
    createDbImage(config.database.mongoTag),
    config.database,
    getMountPointsForContainer(databaseVolumes, databaseContainerName)
  );

  const autoscalingGroup = createAutoScalingGroup(resourcePrefix, cluster, {
    instanceType: config.instanceType,
    vpc,
    subnets,
    keyName: keyPair ? keyPair.keyName : undefined,
  });

  allowEfsAccess(sg, subnets);

  const service = createService(resourcePrefix, {
    cluster,
    containers: {
      app: appContainer,
      [databaseContainerName]: dbContainer,
    },
    volumes: databaseVolumes,
  });

  return output({ url: getUrl(alb) });
}
