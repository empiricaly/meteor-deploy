import { executeHelper } from "/src/helper-programs";
import {
  fileProber,
  PulumiProjectConfigFileObject,
  readConfig,
} from "/src/utils";
import path from "path";

type PulumiStack = {
  name: string;
  current: boolean;
  updateInProgress: boolean;
  url?: string;
};

function isTerminal() {
  return process.stdout.isTTY && process.stdin.isTTY && process.stderr.isTTY;
}

export function pulumiRun(
  dir: string,
  args: string,
  interactive = false
): string {
  if (interactive && !isTerminal()) {
    throw new Error(
      "Cannot run pulumi in interactive mode when it is not executed from a terminal"
    );
  }

  return executeHelper("pulumi", args.split(" "), {
    cwd: dir,
    stdio: interactive ? "inherit" : "pipe",
    autoInstall: true,
  });
}

export function pulumiRequireLogin() {
  // whoami will trigger a login, if not logged in already.
  return pulumiRun(process.cwd(), "whoami", true);
}

export function pulumiListStacks(dir: string): PulumiStack[] {
  pulumiRequireLogin();
  return JSON.parse(pulumiRun(dir, "stack ls -j"));
}

export function pulumiCurrentStack(dir: string): PulumiStack | undefined {
  return pulumiListStacks(dir).find(({ current }) => current);
}

export function pulumiRequireStack(dir: string): PulumiStack {
  let stack = pulumiCurrentStack(dir);

  if (!stack && isTerminal()) {
    pulumiRun(dir, "stack select", true);
    stack = pulumiCurrentStack(dir);
  }

  if (!stack) {
    throw new Error("No pulumi stack has been selected");
  }

  return stack;
}

export function getPulumiProjectConfig(
  dir = process.cwd()
): PulumiProjectConfigFileObject | null {
  const configFile = path.join(dir, "Pulumi.yaml");
  return fileProber.exists(configFile)
    ? readConfig<PulumiProjectConfigFileObject>(path.join(dir, "Pulumi.yaml"))
    : null;
}

export function getPulumiProjectName(dir = process.cwd()): string | null {
  const { name = null } = getPulumiProjectConfig(dir) || {};
  return name;
}

export function requirePulumiProjectName(dir = process.cwd()): string {
  const projectName = getPulumiProjectName(dir);

  if (!projectName) {
    throw new Error(`Could not find a valid Pulumi project in '${dir}'`);
  }

  return projectName;
}
