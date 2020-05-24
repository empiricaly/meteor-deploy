import { executeHelper } from "/src/helper-programs";

type PulumiStack = {
  name: string;
  current: boolean;
  updateInProgress: boolean;
  url?: string;
};

export function pulumiRun(
  dir: string,
  args: string,
  interactive = false
): string {
  return executeHelper("pulumi", args.split(" "), {
    cwd: dir,
    stdio: interactive ? "inherit" : "pipe",
    shell: interactive,
    autoInstall: true,
  });
}

export function pulumiListStacks(dir: string): PulumiStack[] {
  return JSON.parse(pulumiRun(dir, "stack ls -j"));
}

export function pulumiCurrentStack(dir: string): PulumiStack | undefined {
  return pulumiListStacks(dir).find(({ current }) => current);
}

export function pulumiRequireStack(dir: string): PulumiStack {
  let stack = pulumiCurrentStack(dir);

  if (!stack) {
    pulumiRun(dir, "stack select", true);
    stack = pulumiCurrentStack(dir);
  }

  if (!stack) {
    throw new Error("No pulumi stack has been selected");
  }

  return stack;
}
