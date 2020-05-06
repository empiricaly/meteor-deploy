import { ec2 } from "@pulumi/aws";
import { JsonableObj, schema } from "/src/utils";

export type Config = {
  instanceType: ec2.InstanceType;
  publicKey?: string;
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
        .default(1024)
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
        .describe("Run time environment variables"),
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
