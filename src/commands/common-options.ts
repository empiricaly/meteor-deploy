import { Command } from "commander";
import { getAttributeName, getPackageInfo } from "/src/utils";

const { name: packageName } = getPackageInfo();

const COMMON_OPTIONS = {
  meteorDirectory: {
    flags: "--meteor-directory <dir>",
    description: "The directory of the meteor project to be deployed.",
    defaultValue: process.cwd(),
  },
  simulation: {
    flags: "-s, --simulation",
    description: "Simulate command, without writing anything to the filesystem",
    defaultValue: false,
  },
  verbosity: {
    flags: "-v, --verbose",
    description: "Enables a high level of verbosity for debugging purposes.",
    defaultValue: false,
  },

  developmentMode: {
    flags: "-d, --development-mode",
    description: `Only to be used by ${packageName} developers.`,
    defaultValue: false,
  },
};

type OptionHash = {
  meteorDirectory: string;
  simulation: boolean;
  verbosity: boolean;
  developmentMode: boolean;
};

export function commonOptions<Key extends keyof typeof COMMON_OPTIONS>(
  program: Command,
  ...names: Key[]
): () => Pick<OptionHash, Key> {
  const map = names.map((name) => {
    const { flags, description } = COMMON_OPTIONS[name];
    program.option(flags, description);
    return { key: getAttributeName(flags, description), name };
  });

  return () => {
    const opts = program.opts();

    return Object.assign(
      {},
      ...map.map(({ key, name }) => ({
        [name]:
          opts[key] === undefined
            ? COMMON_OPTIONS[name].defaultValue
            : opts[key],
      }))
    );
  };
}
