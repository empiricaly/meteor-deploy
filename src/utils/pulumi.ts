import * as path from "path";
import { readConfig } from "./config-files";
import { execSync, ExecSyncOptions } from "child_process";

export type PulumiProjectConfigFileObject = {
  name: string;
  runtime:
    | "nodejs"
    | {
        name: "nodejs";
        options?: {
          /**
           * Controls whether to use ts-node to execute sources.
           * @default true
           */
          typescript?: boolean;
        };
      };
  /**
   * A friendly description about your project.
   */
  description?: string;
  main?: string;
  /**
   * Directory to store stack-specific configuration files, relative to location of Pulumi.yaml.
   */
  config?: string;
  /**
   * Configuration for project state backend.
   */
  backend?: {
    /**
     * Explicitly specify backend url like https://pulumi.acmecorp.com, file:///app/data, etc.
     */
    url: string;
  };
};

export function getPulumiProjectConfig(dir = process.cwd()) {
  return readConfig<PulumiProjectConfigFileObject>(
    path.join(dir, `Pulumi.yaml`)
  );
}

export function getPulumiDeploymentDirectory(dir = process.cwd()): string {
  const { main = dir } = getPulumiProjectConfig(dir);
  return main;
}

export function pulumiStackConfig(stack: string, config: object): object {
  return Object.assign(
    {},
    ...Object.entries(config).map(([key, value]) => ({
      [`${stack}:${key}`]: value,
    }))
  );
}

type PulumiStack = {
  name: string;
  current: boolean;
  updateInProgress: boolean;
  url?: string;
};
export function pulumiRun(
  args: string,
  options?: Omit<ExecSyncOptions, "encoding" | "env">
): string {
  return execSync(`pulumi ${args}`, {
    ...options,
    encoding: "utf-8",
    env: {
      ...process.env,
      PATH: `${process.env.PATH}:${process.env.HOME}/.pulumi/bin`,
    },
  });
}

export function pulumiListStacks(dir: string): PulumiStack[] {
  return JSON.parse(
    pulumiRun("stack ls -j", {
      cwd: dir,
    })
  );
}

export function pulumiCurrentStack(dir: string): PulumiStack | undefined {
  return pulumiListStacks(dir).find(({ current }) => current);
}

export function pulumiRequireStack(dir: string): PulumiStack {
  const stack = pulumiCurrentStack(dir);

  if (!stack) {
    throw new Error(
      `No pulumi stack has been selected. Please select one with 'pulumi stack select'`
    );
  }

  return stack;
}
