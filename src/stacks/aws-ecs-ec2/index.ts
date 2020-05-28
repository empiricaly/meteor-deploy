import { Input, log, output } from "@pulumi/pulumi";
import { getRegion } from "@pulumi/aws";

import { allowEfsAccess, createSecurityGroup, createVpc } from "./network";
import {
  createDatabaseRexrayStorageVolumes,
  createDatabaseEfsVolumes,
  getMountPointsForContainer,
  VolumeDefinition,
  createDatabaseLocalStorageVolumes,
  mountLocalFileSystemScript,
  createEbsVolume,
  installRexrayScript,
} from "./storage";
import {
  createAutoScalingGroup,
  createAutoScalingInstanceProfile,
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

import { Config, getConfigSchema } from "./config";
import { createApplicationListener, getUrl } from "./routing";
import { StackOutput } from "/src/stacks";
import { configureTags } from "./tags";
import { createDomainRecord } from "./domain";

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
  const schema = getConfigSchema();

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
    vpc.privateSubnets,
  ]);

  // XXX Since pulumi-crosswalk does not support defining availability zones on autoscaling groups, we cheat it by
  // constraining the subnets instead. This is required, because EBS Volumes are not multi-az.
  // https://github.com/pulumi/pulumi-awsx/issues/536
  const [ebsSubnet] = subnets;
  const autoscalerSubnets =
    database.storage.type === "ebs" ? [ebsSubnet] : subnets;

  let databaseVolumes: VolumeDefinition<"database">[] = [];

  if (database.storage.type === "efs") {
    const sg = createSecurityGroup(resourcePrefix, { vpc });

    databaseVolumes = createDatabaseEfsVolumes(resourcePrefix, {
      subnets: privateSubnets,
      sg,
    });

    allowEfsAccess(sg, subnets);
  }

  const keyPair = publicKey && createKeyPair(resourcePrefix, publicKey);

  const cluster = createCluster(resourcePrefix, { vpc });

  let userData: Input<string> | undefined;

  if (database.storage.type === "ebs-rexray") {
    databaseVolumes = createDatabaseRexrayStorageVolumes(
      `${resourcePrefix}-ebs-rexray`,
      database.storage.rexrayVolumeSizes
    );

    userData = output({
      clusterName: cluster.cluster.name,
      region: output(getRegion()).apply(({ name }) => name),
    }).apply(installRexrayScript);
  }

  const autoscalerDependencies = [];

  if (database.storage.type === "ebs") {
    const persistentStoragePath = "/volumes/ebs";

    const ebsVolume = createEbsVolume(resourcePrefix, {
      size:
        database.storage.volumeSize ||
        schema.database.storage.volumeSize.defaultValue,
      availabilityZone: ebsSubnet.subnet.availabilityZone,
      snapshotId: database.storage.snapshotId,
    });

    autoscalerDependencies.push(ebsVolume);

    userData = output({
      clusterName: cluster.cluster.name,
      ebsVolumeId: ebsVolume.id,
      mountPoint: persistentStoragePath,
      region: getRegion().then(({ name }) => name),
    }).apply(mountLocalFileSystemScript);

    databaseVolumes = createDatabaseLocalStorageVolumes(
      resourcePrefix,
      persistentStoragePath
    );
  }

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

  const instanceProfile = createAutoScalingInstanceProfile(
    `${resourcePrefix}-instance-profile`,
    [database.storage.type]
  );

  createAutoScalingGroup(
    resourcePrefix,
    cluster,
    {
      instanceType: config.instanceType,
      vpc,
      subnets: autoscalerSubnets,
      keyName: keyPair ? keyPair.keyName : undefined,
      instanceProfile,
      userData,
    },
    {
      dependsOn: autoscalerDependencies,
    }
  );

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
