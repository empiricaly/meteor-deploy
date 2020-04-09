import { Region } from "@pulumi/aws";
import { Schema, StringField } from "/src/utils/schema";

export type Config = {
  region: Region;
};

export type ConfigSchema = Schema<Config>;

export function getConfigSchema(): ConfigSchema {
  return {
    region: StringField.required<Region>()
      .default("us-east-1")
      .pattern(/[a-z]{2}-[a-z]+-\d+/)
      .commandOption("--aws-region <region>")
      .describe(
        "AWS Region to deploy to. See https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html"
      ),
  };
}
