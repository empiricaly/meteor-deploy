import { isValidStackType, StackOutput, stacks } from "./stacks";
import * as pulumi from "@pulumi/pulumi";
import { wrapSchema, getConfig } from "./utils/pulumi-config";
import { Config } from "./stacks/aws-ecs-ec2";

function helpFixingConfig<T>(configKey: string, allowedValues: T[]): string {
  return `Please select a valid ${configKey} with 'pulumi config set ${
    configKey.includes(".") ? `--path ${configKey}` : configKey
  } <value>' where value has to be one of the following: "${allowedValues.join(
    "', '"
  )}"`;
}

export default async function (): Promise<StackOutput> {
  const stackName = pulumi.getStack();
  if (!stackName) {
    throw new Error(
      "No stack selected. Please select one with 'pulumi stack select'"
    );
  }

  const pulumiConfig = new pulumi.Config();

  const stackTypeKey = "stackType";

  const stackType = pulumiConfig.require(stackTypeKey, {
    allowedValues: Object.keys(stacks),
  });

  if (!isValidStackType(stackType)) {
    throw new Error(
      `Encountered invalid value for stackType: ${stackType}. \n${helpFixingConfig(
        stackTypeKey,
        Object.keys(stacks)
      )}`
    );
  }

  const stack = stacks[stackType];
  const schema = wrapSchema(stack.getConfigSchema());
  const config = getConfig(schema, pulumiConfig);

  return config.apply((config) =>
    stack.createStack(stackName, (config as unknown) as Config)
  ) as StackOutput;
}
