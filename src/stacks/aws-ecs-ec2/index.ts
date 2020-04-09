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
export * from "./config";

export async function createStack(
  stackName: string,
  { publicKey, ...config }: Config,
  { meteorDirectory = process.cwd() }: { meteorDirectory?: string } = {}
): Promise<StackOutput> {
  const repo = createContainerRegistry(stackName);
  const vpc = createVpc(stackName);

  const [subnets, privateSubnets] = await Promise.all([
    vpc.publicSubnets,
    vpc.publicSubnets,
  ]);

  const sg = createSecurityGroup(stackName, { vpc });

  const databaseVolumes = createDatabaseEfsVolumes(stackName, {
    subnets: privateSubnets,
    sg,
  });

  const keyPair = publicKey && createKeyPair(stackName, publicKey);

  const cluster = createCluster(stackName, { vpc });

  const alb = createApplicationListener(stackName, { vpc });

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

  const autoscalingGroup = createAutoScalingGroup(stackName, cluster, {
    instanceType: config.instanceType,
    vpc,
    subnets,
    keyName: keyPair ? keyPair.keyName : undefined,
  });

  allowEfsAccess(sg, subnets);

  const service = createService(stackName, {
    cluster,
    containers: {
      app: appContainer,
      [databaseContainerName]: dbContainer,
    },
    volumes: databaseVolumes,
  });

  return output({ url: getUrl(alb) });
}
