import { Command } from "commander";
import { commonOptions } from "./common-options";
import * as defaultStack from "/src/stacks/default";

import {
  PulumiProjectInitializer,
  ExecutionReporter,
  PulumiStackConfigurator,
  runSequence,
} from "/src/initializers";
import {
  pulumiCurrentStack,
  pulumiRequireStack,
  requirePulumiProjectName,
} from "/src/pulumi";
import { clouds } from "/src/clouds";

async function initSequence({
  projectName,
  meteorDirectory,
  description,
  simulation,
  reporter,
}: {
  projectName?: string;
  meteorDirectory: string;
  description?: string;
  simulation?: boolean;
  reporter?: ExecutionReporter;
}) {
  const initializer = PulumiProjectInitializer.create(simulation).addProject({
    projectName,
    meteorDirectory,
    description,
  });

  await runSequence(initializer, reporter);
}

async function configSequence({
  meteorDirectory,
  simulation,
  reporter,
}: {
  meteorDirectory: string;
  simulation?: boolean;
  reporter?: ExecutionReporter;
}) {
  const projectName = requirePulumiProjectName(meteorDirectory);
  const { name: stackName } = pulumiRequireStack(meteorDirectory);

  const configurator = PulumiStackConfigurator.create(simulation).addStack({
    stackName,
    config: {
      [defaultStack.cloud]: clouds[defaultStack.cloud].getDefaultConfig(),
      [projectName]: {
        stackType: defaultStack.stackType,
      },
    },
    meteorDirectory,
  });

  await runSequence(configurator, reporter);
}

export default function (program: Command): void {
  program.arguments("[projectName]");
  program.description(
    "Initialize a deployment project in the current directory"
  );

  const getOptions = commonOptions(program, "simulation", "meteorDirectory");

  program
    .option(
      "--description <string>",
      "The description of the deployment project."
    )
    .option(
      "--skip-configuration",
      "Do not configure a stack with default configuration"
    );

  program.action(async (projectName?: string) => {
    const {
      description,
      "skip-configuration": skipConfiguration,
    } = program.opts();
    const { meteorDirectory, simulation } = getOptions();
    const reporter = new ExecutionReporter();

    await initSequence({
      meteorDirectory,
      simulation,
      projectName,
      description,
      reporter,
    });

    if (!skipConfiguration && !pulumiCurrentStack(meteorDirectory)) {
      await configSequence({ meteorDirectory, simulation, reporter });
    }
  });
}
