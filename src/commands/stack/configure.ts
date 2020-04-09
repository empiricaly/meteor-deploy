import {
  CommanderField,
  PulumiProjectConfigFileObject,
  pulumiRequireStack,
  readConfig,
} from "/src/utils";
import { Command } from "commander";
import { commonOptions } from "/src/commands/common-options";
import { STACK_TYPE, stacks } from "/src/stacks";
import { clouds } from "/src/clouds";
import { PulumiStackConfigurator } from "/src/initializers";

export default async function (program: Command) {
  program.description("Creates a deployment stack configuration");

  const getCommonOptions = commonOptions(
    program,
    "meteorDirectory",
    "simulation"
  );

  Object.entries(stacks).forEach(
    ([stackType, { getConfigSchema, description, cloud }]) => {
      const stackSchema = getConfigSchema();
      const cloudSchema = clouds[cloud].getConfigSchema();
      const subProgram = program.command(stackType) as Command;

      if (description) {
        subProgram.description(description);
      }

      const stackOptions = CommanderField.wrapSchema(stackSchema);
      const cloudOptions = CommanderField.wrapSchema(cloudSchema);

      CommanderField.configure(stackOptions, subProgram);
      CommanderField.configure(cloudOptions, subProgram);

      subProgram.action(async () => {
        const { simulation, meteorDirectory } = getCommonOptions();
        const { name: stackName } = pulumiRequireStack(meteorDirectory);
        const { name: projectName } = readConfig<PulumiProjectConfigFileObject>(
          "Pulumi.yaml"
        );

        const config = CommanderField.retrieve(stackOptions, subProgram);
        const initializer = PulumiStackConfigurator.create(simulation).addStack(
          {
            stackName,
            config: {
              [cloud]: CommanderField.retrieve(cloudOptions, subProgram),
              [projectName]: {
                stackType: stackType as STACK_TYPE,
                ...config,
              },
            },
            meteorDirectory,
          }
        );

        await initializer.execute();
      });
    }
  );
}
