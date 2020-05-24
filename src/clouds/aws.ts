import * as regionVars from "@pulumi/aws/region";
import { Region } from "@pulumi/aws";
import { output, runtime, Input } from "@pulumi/pulumi";
import { Tags } from "@pulumi/aws";
import { Schema, StringField } from "/src/utils/schema";
import { execSync } from "child_process";

// XXX this will potentially break in a future update of pulumi, if they add an export to that regions.ts module that is
// not a string representing a region. However TypeScript will detect such a change and warn about it at build time,
// in which case we can easily take corrective action.
const regions: Set<Region> = new Set(
  Object.entries(regionVars).map(([, region]) => region)
);

function isRegion(region: string): region is Region {
  // XXX ts is being quite silly about the prototype of .has(). The arg should not be constrained to the type of
  // set elements. That is the whole point of the .includes anyway.
  return regions.has(region as Region);
}

export function registerAutoTags(tags: Input<Tags>): void {
  runtime.registerStackTransformation(({ props, opts }) => {
    props["tags"] = output(tags).apply((tags) => ({
      ...tags,
      ...props["tags"],
    }));
    return { props, opts };
  });
}

export type Config = {
  region: Region;
};

export type ConfigSchema = Schema<Config>;

export function getDefaultRegion(): Region {
  try {
    const region = execSync("aws configure get region", {
      encoding: "utf-8",
    }).trim();
    if (!isRegion(region)) {
      throw new Error(`AWS CLI returned an unknown region '${region}'`);
    }
    return region;
  } catch (error) {
    // If aws-cli is not installed or it is not outputting what we would expect it to output it means that our best
    // guess for suitable region will not be as good as it could have been. So we fallback to the most popular region...
    // TODO log error in debug mode.
    console.error(error);
    return "us-east-1";
  }
}

export function getConfigSchema(): ConfigSchema {
  return {
    region: StringField.required<Region>()
      .default(getDefaultRegion())
      .allowed(...regions)
      .pattern(/[a-z]{2}-[a-z]+-\d+/)
      .commandOption("--aws:region <region>")
      .describe(
        "AWS Region to deploy to. See https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html"
      ),
  };
}
