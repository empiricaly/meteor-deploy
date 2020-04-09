import { Input } from "@pulumi/pulumi";
import * as awsEcsEc2 from "./aws-ecs-ec2";
import { CloudName } from "/src/clouds";
import { Data } from "/src/utils/schema";

type StackCreationOptions = {
  meteorDirectory?: string;
};

export type StackOutput = Input<{ url: string }>;

interface StackRegistryEntry<
  Schema extends object,
  Config extends object = Data<Schema>
> {
  readonly description?: string;
  readonly cloud: CloudName;
  getConfigSchema(): Schema;
  createStack(
    stackName: string,
    config: Config,
    options?: StackCreationOptions
  ): StackOutput | Promise<StackOutput>;
}

export const stacks: {
  "aws-ecs-ec2": StackRegistryEntry<awsEcsEc2.ConfigSchema, awsEcsEc2.Config>;
} = {
  "aws-ecs-ec2": {
    ...awsEcsEc2,
    description: "Deploy on AWS ECS using EC2 instances",
  },
};

export type STACK_TYPE = keyof typeof stacks;

export function isValidStackType(stackType: string): stackType is STACK_TYPE {
  return Object.keys(stacks).includes(stackType);
}
