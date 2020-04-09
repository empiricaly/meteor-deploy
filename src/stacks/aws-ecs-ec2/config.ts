import { ec2 } from "@pulumi/aws";
import { JsonableObj, schema } from "/src/utils";

export type Config = {
  instanceType: ec2.InstanceType;
  publicKey?: string;
  app: {
    memory: number;
    meteorSettings?: JsonableObj;
    rootUrl?: string;
  };
  database: {
    mongoTag: string;
    memory: number;
  };
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

    app: {
      rootUrl: schema.StringField.optional()
        .pattern(/^http?s:\//i)
        .commandOption("--app:endpoint <url>")
        .describe("The root url at which the application will be hosted"),
      memory: schema.NumberField.required()
        .default(1024)
        .range({ min: 0 })
        .commandOption("--app:memory <number>")
        .describe(
          "The amount of available memory to assign the application container"
        ),
      meteorSettings: schema.ObjectOrArrayField.optional<JsonableObj>()
        .commandOption("--app:meteor-settings <json>")
        .describe("METEOR_SETTINGS object as a json string"),
    },

    database: {
      memory: schema.NumberField.required()
        .default(1024)
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
    },
  };
}
