import { Wrapper } from "/src/initializers/wrapper";
import { CoreInitializer } from "/src/initializers/core";
import { execSync } from "child_process";
import { hasMeteor, hasPulumi, requireNpmExecutable } from "/src/utils";

export class ProgramInitializer extends Wrapper<CoreInitializer> {
  constructor(core: CoreInitializer, protected simulationMode = false) {
    super(core);
  }

  protected execSim(command: string, cwd: string): this {
    console.log(`Would execute: '${command}' on ${cwd}`);
    return this;
  }

  protected runCommand(command: string, cwd: string): void {
    this.simulationMode
      ? this.execSim(command, cwd)
      : execSync(command, { cwd, stdio: "inherit" });
  }

  addExec({
    command,
    cwd = process.cwd(),
    description,
  }: {
    command: string;
    cwd?: string;
    description: string;
  }): this {
    this.core.addStep({
      type: "Execute Command",
      command,
      targetPath: cwd,
      description,
      run: () => this.runCommand(command, cwd),
    });

    return this;
  }

  addNpmLink(dir: string, packageName = ""): this {
    const npm = requireNpmExecutable();

    return this.addExec({
      command: `${npm} link ${packageName}`,
      cwd: dir,
      description: packageName
        ? `Link npm package '${packageName}'`
        : "Link npm package",
    });
  }

  addNpmPackageInstall(dir: string): this {
    const npm = requireNpmExecutable();

    return this.addExec({
      command: `${npm} install`,
      cwd: dir,
      description: "Install npm modules",
    });
  }

  addMeteorInstall(): this {
    if (!hasMeteor()) {
      this.addExec({
        command: "curl https://install.meteor.com/ | sh",
        description: "Install the latest version of Meteor",
      });
    }
    return this;
  }

  addPulumiInstall(): this {
    if (!hasPulumi()) {
      this.addExec({
        command: "curl -fsSL https://get.pulumi.com | sh",
        description: "Install the latest version of the pulumi runtime",
      });
    }
    return this;
  }
}
