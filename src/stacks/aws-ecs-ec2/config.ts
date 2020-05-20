import { ec2, Tags } from "@pulumi/aws";
import { JsonableObj, schema } from "/src/utils";
import { StorageType, DatabaseVolumeName } from "./storage";

export type Config = {
  instanceType: ec2.InstanceType;
  publicKey?: string;
  domain?: {
    zoneId?: string;
    name: string;
    ttl: number;
  };
  https?: {
    certificateArn: string;
  };
  app: {
    memory: number;
    meteorSettings?: JsonableObj;
    rootUrl?: string;
    env?: {
      name: string;
      value: string;
    }[];
  };
  database: {
    mongoTag: string;
    memory: number;
    storageType: StorageType;
    ebsRexrayVolumeSizes?: Record<DatabaseVolumeName, number | undefined>;
    ebsVolumeSize?: number;
    ebsSnapshotId?: string;
  };
  tags?: Tags;
  disableProjectTags?: boolean;
};

export type ConfigSchema = schema.OpinionatedSchema<Config>;

export const cloud = "aws";

export function getConfigSchema(): ConfigSchema {
  return {
    publicKey: schema.StringField.optional()
      .commandOption("--publicKey <string>")
      .describe("Enables SSH access for the provided ssh key"),

    instanceType: schema.StringField.required<ec2.InstanceType>()
      .commandOption("--instanceType <type>")
      .describe(
        "The type of EC2 instances to use. Select one from: https://aws.amazon.com/ec2/instance-types/"
      ),

    domain: schema.ObjectField.optional({
      zoneId: schema.StringField.optional()
        .describe(
          "Route53 hosted zone ID to which the domain should be added to"
        )
        .commandOption("--domain:zoneId <string>"),
      name: schema.StringField.required()
        .commandOption("--domain:name <domain>")
        .describe(
          "Domain name to be used as the primary domain. If no zoneId is set, then this is treated as a fqdn. Otherwise it is treated as a sub-domain."
        )
        .pattern(/^[^:/@]+$/),
      ttl: schema.NumberField.required()
        .commandOption("--dommain:ttl <number>")
        .describe("TTL for the domain record, applicable when zoneId is set.")
        .default(5)
        .range({ min: 0 }),
    }),

    https: schema.ObjectField.optional({
      certificateArn: schema.StringField.required()
        .commandOption("--https:certificate <arn>")
        .describe(
          "Enables support for https for the ARN to a AWS Certificate Manager resource"
        ),
    }),

    app: {
      rootUrl: schema.StringField.optional()
        .pattern(/^https?:\//i)
        .commandOption("--app:endpoint <url>")
        .describe("The root url at which the application will be hosted"),

      memory: schema.NumberField.required()
        .default(368)
        .range({ min: 0 })
        .commandOption("--app:memory <number>")
        .describe(
          "The amount of available memory to assign the application container"
        ),

      meteorSettings: schema.ObjectField.optional<JsonableObj>()
        .commandOption("--app:meteor-settings <json>")
        .describe("METEOR_SETTINGS object as a json string"),

      env: schema.ArrayField.optional<{ name: string; value: string }[]>({
        name: schema.StringField.required().describe(
          "Name of environment variable"
        ),
        value: schema.StringField.required().describe(
          "Value of environment variable"
        ),
      })
        .default([])
        .describe("Runtime environment variables"),
    },

    database: {
      memory: schema.NumberField.required()
        .default(368)
        .range({ min: 0 })
        .commandOption("--db:memory <number>")
        .describe(
          "The amount of available memory to assign the database container"
        ),
      mongoTag: schema.StringField.required()
        .commandOption("--db:mongodb-image-tag <tag>")
        .default("latest")
        .describe(
          "Specify the MongoDB version to use. Available options: https://hub.docker.com/_/mongo?tab=tags"
        ),
      storageType: schema.StringField.required<StorageType>()
        .commandOption("--db:storage-type <string>")
        .allowed("efs", "ebs", "ebs-rexray")
        .default("ebs")
        .describe("The type of persistent storage to use for the database"),
      ebsRexrayVolumeSizes: schema.ObjectField.optional<
        Record<DatabaseVolumeName, number | undefined>
      >({
        db: schema.NumberField.optional().range({ min: 0 }).default(30),
        configdb: schema.NumberField.optional().range({ min: 0 }).default(1),
      }),
      ebsVolumeSize: schema.NumberField.optional()
        .range({ min: 0 })
        .default(10)
        .commandOption("--db:ebs-volume-size <Gigabytes>")
        .describe(
          "Size in Gigabytes for persistent storage (applicable for storageType=ebs)"
        ),
      ebsSnapshotId: schema.StringField.optional()
        .describe("Restores database from the given EBS-snapshot")
        .commandOption("--db:ebs-snapshot <snapshotId>"),
    },

    tags: schema.ObjectField.optional<Tags>().describe(
      "Additional tags to add to all provisioned AWS resources"
    ),

    disableProjectTags: schema.BooleanField.optional()
      .describe("Do not add default project tags to provisioned resources")
      .commandOption("--disable-default-tags")
      // XXX default is true as auto-tagging is currently broken.
      .default(true),
  };
}
