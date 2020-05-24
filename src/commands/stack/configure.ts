import {
  CommanderField,
  PulumiProjectConfigFileObject,
  readConfig,
} from "/src/utils";
import { Command } from "commander";
import { commonOptions } from "/src/commands/common-options";
import { stacks, GetConfig as GetStackConfig, STACK_TYPE } from "/src/stacks";
import { clouds, GetConfig as GetCloudConfig } from "/src/clouds";
import { PulumiStackConfigurator } from "/src/initializers";
import { pulumiRequireStack } from "/src/pulumi";

type GetCloudConfigForStackType<T extends STACK_TYPE> = GetCloudConfig<
  typeof clouds[typeof stacks[T]["cloud"]]
>;

type GetStackConfigForStackType<T extends STACK_TYPE> = GetStackConfig<
  typeof stacks[T]
>;

type StackConfig<T extends STACK_TYPE> = {
  stackType: T;
  stackConfig: GetStackConfigForStackType<T>;
  cloudConfig: GetCloudConfigForStackType<T>;
};

export default async function configure(program: Command) {
  program.description("Creates a deployment stack configuration");

  const getCommonOptions = commonOptions(
    program,
    "meteorDirectory",
    "simulation"
  );

  function programAction(
    stackType: STACK_TYPE,
    getConfig: () => {
      stackConfig: GetStackConfigForStackType<typeof stackType>;
      cloudConfig: GetCloudConfigForStackType<typeof stackType>;
    }
  ) {
    return async () => {
      const { name: projectName } = readConfig<PulumiProjectConfigFileObject>(
        "Pulumi.yaml"
      );

      const { simulation, meteorDirectory } = getCommonOptions();
      const { name: stackName } = pulumiRequireStack(meteorDirectory);

      const { stackConfig, cloudConfig } = getConfig();

      const initializer = PulumiStackConfigurator.create(simulation).addStack({
        stackName,
        config: {
          [stacks[stackType].cloud]: cloudConfig,
          [projectName]: { stackType, ...stackConfig },
        },
        meteorDirectory,
      });

      await initializer.execute();
    };
  }

  Object.entries(stacks).forEach(
    ([stackType, { getConfigSchema, description, cloud }]) => {
      const stackSchema = getConfigSchema();
      const cloudSchema = clouds[cloud].getConfigSchema();
      const subProgram = program.command(stackType, {
        isDefault: stackType === "default",
      }) as Command;

      if (description) {
        subProgram.description(description);
      }

      const stackOptions = CommanderField.wrapSchema(stackSchema);
      const cloudOptions = CommanderField.wrapSchema(cloudSchema);

      CommanderField.configure(stackOptions, subProgram);
      CommanderField.configure(cloudOptions, subProgram);

      subProgram.action(
        programAction(stackType as STACK_TYPE, () => ({
          cloudConfig: CommanderField.retrieve(cloudOptions, subProgram),
          stackConfig: CommanderField.retrieve(stackOptions, subProgram),
        }))
      );
    }
  );
}
