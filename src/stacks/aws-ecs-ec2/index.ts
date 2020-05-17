import { Input, log } from "@pulumi/pulumi";
import { allowEfsAccess, createSecurityGroup, createVpc } from "./network";
import {
  createDatabaseBlockStorageVolumes,
  createDatabaseEfsVolumes,
  getMountPointsForContainer,
  isBlockStorageVolume,
  VolumeDefinition,
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
import { createDomainRecord } from "/src/stacks/aws-ecs-ec2/domain";
export * from "./config";

export const stackType = "aws-ecs-ec2";

export async function createStack(
  projectName: string,
  stackName: string,
  {
    publicKey,
    tags,
    disableProjectTags,
    https,
    domain,
    database,
    ...config
  }: Config,
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

  let databaseVolumes: VolumeDefinition<"database">[] = [];

  if (database.storageType === "efs") {
    const sg = createSecurityGroup(resourcePrefix, { vpc });

    databaseVolumes = createDatabaseEfsVolumes(resourcePrefix, {
      subnets: privateSubnets,
      sg,
    });

    allowEfsAccess(sg, subnets);
  }

  if (database.storageType === "ebs") {
    databaseVolumes = createDatabaseBlockStorageVolumes(
      `${resourcePrefix}-ebs`,
      database.ebsVolumeSizes
    );
  }

  const keyPair = publicKey && createKeyPair(resourcePrefix, publicKey);

  const cluster = createCluster(resourcePrefix, { vpc });

  const alb = createApplicationListener(resourcePrefix, { vpc, https });

  const databaseContainerName = "database";

  let domainUrl: Input<string> = getUrl(alb);

  if (domain?.zoneId) {
    const { zoneId } = domain;
    const domainRecord = createDomainRecord(resourcePrefix, {
      ...domain,
      zoneId,
      cname: alb.endpoint.hostname,
    });

    domainUrl = domainRecord.fqdn.apply(
      (fqdn) => `${https ? "https" : "http"}://${fqdn}`
    );
  } else if (domain) {
    domainUrl = `${https ? "https" : "http"}://${domain.name}`;
    alb.endpoint.hostname.apply((hostname) =>
      log.info(
        `Please add a CNAME Record for the domain '${domain.name}' with the value: ${hostname}`
      )
    );
  }

  const appContainer = createAppContainer(
    createAppImage(meteorDirectory, repo),
    {
      rootUrl: domainUrl,
      ...config.app,
    },
    { alb, databaseContainerName }
  );

  const dbContainer = createDbContainer(
    createDbImage(database.mongoTag),
    database,
    getMountPointsForContainer(databaseVolumes, databaseContainerName)
  );

  createAutoScalingGroup(resourcePrefix, cluster, {
    instanceType: config.instanceType,
    vpc,
    subnets,
    keyName: keyPair ? keyPair.keyName : undefined,
    ebsVolumes: databaseVolumes.filter(isBlockStorageVolume),
  });

  createService(resourcePrefix, {
    cluster,
    containers: {
      app: appContainer,
      [databaseContainerName]: dbContainer,
    },
    volumes: databaseVolumes,
  });

  return { url: domainUrl };
}
