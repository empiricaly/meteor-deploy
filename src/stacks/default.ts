import * as stack from "./aws-ecs-ec2";
import { Schema } from "/src/utils/schema";
import { StackOutput } from "/src/stacks/index";

// The default stack is pseudo stack type that wraps another configurable stack, but is not configurable itself.
// This means that if users opt to choose the default stack and the default configuration is changed in an upgrade,
// then these users will automatically inherit that new default configuration, instead of keeping their old configuration
// in place.

export const cloud = stack.cloud;

// These properties are useful, but meteor-deploy will never be able to define them as a default. So we can still expose
// them:
export type Config = Pick<stack.Config, "https" | "domain" | "publicKey">;

export type ConfigSchema = Schema<Config>;
export function getConfigSchema(): ConfigSchema {
  const { publicKey, domain, https } = stack.getConfigSchema();
  return {
    publicKey,
    domain,
    https,
  };
}

export const config: stack.Config = {
  instanceType: "t2.micro",
  app: {
    memory: 368,
  },
  database: {
    memory: 368,
    mongoTag: "latest",
    storageType: "ebs",
  },
  // XXX currently auto-tags do not work yet.
  disableProjectTags: true,
};

export function createStack(
  projectName: string,
  stackName: string,
  overrides: Config,
  options?: { meteorDirectory?: string }
): Promise<StackOutput> {
  return stack.createStack(
    projectName,
    stackName,
    { ...config, ...overrides },
    options
  );
}
