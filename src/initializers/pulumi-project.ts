import {
  fileProber,
  getPackageInfo,
  Indent,
  PulumiProjectConfigFileObject,
} from "/src/utils";
import path from "path";
import { DEVELOPMENT_ARTIFACTS } from "/src/development-artifacts";
import { ROOT as PACKAGE_ROOT } from "/root";
import { FileInitializer } from "./file-initializer";
import { Wrapper } from "./wrapper";
import { ProgramInitializer } from "./program-initializer";
import { CoreInitializer } from "./core";

const RESOURCE_FILES = path.resolve(PACKAGE_ROOT, "resource-files");

function getDefaultProjectName(meteorDir = process.cwd()): string {
  const { name } = getPackageInfo(meteorDir);
  return name;
}

function getDefaultDescription(): string {
  const { name, version } = getPackageInfo();
  return `Pulumi infrastructure deployment project generated by ${name} (Version ${version})`;
}

export class PulumiProjectInitializer extends Wrapper<CoreInitializer> {
  static create(simulation?: boolean): PulumiProjectInitializer {
    const core = new CoreInitializer();
    return new this(core, FileInitializer.create(simulation, core));
  }

  constructor(
    core: CoreInitializer = new CoreInitializer(),
    private fileInitializer: FileInitializer = FileInitializer.create(
      false,
      core
    ),
    private programInitializer: ProgramInitializer = new ProgramInitializer(
      core
    )
  ) {
    super(core);
  }

  addMeteorIgnore(dir: string, extraEntries: string[] = []): this {
    this.fileInitializer.addIgnoreEntries(
      ["Pulumi.yaml", "Pulumi.*.yaml", ...extraEntries],
      path.join(dir, ".meteorignore")
    );
    return this;
  }

  addDockerIgnore(dir: string, extraEntries: string[] = []): this {
    this.fileInitializer.addIgnoreEntries(
      [
        "Dockerfile",
        ".dockerignore",
        ".meteor/local",
        "Pulumi.yaml",
        "Pulumi.*.yaml",
        "Pulumi.yml",
        "Pulumi.*.yml",
        ...DEVELOPMENT_ARTIFACTS,
        ...extraEntries,
      ],
      path.join(dir, ".dockerignore")
    );
    return this;
  }

  addPulumiYaml(
    dir: string,
    props: Omit<PulumiProjectConfigFileObject, "runtime">
  ): this {
    this.fileInitializer.addConfigFile(
      { ...props, runtime: "nodejs" },
      {
        targetPath: path.join(dir, "Pulumi.yaml"),
        indent: Indent.Default,
      }
    );

    return this;
  }

  addResourceFiles(
    dir: string,
    map: Record<string, string> = {},
    symbolicLink = false,
    resourceDir = RESOURCE_FILES
  ): this {
    ["Dockerfile", "index.js"].forEach((filename) => {
      const { [filename]: targetFilename = filename } = map;
      const src = path.resolve(resourceDir, filename);
      const dest = path.resolve(dir, targetFilename);

      this.fileInitializer.installFile(src, dest, symbolicLink);
    });
    return this;
  }

  linkPackage(dir: string): this {
    const { name } = getPackageInfo();
    // XXX When using nvm npm link may not find the linked package, when a different environment is in use.
    // this.programInitializer.addNpmLink(dir, name);

    const source = PACKAGE_ROOT;
    const target = path.join(dir, "node_modules", name);

    this.fileInitializer.addDirectoryLink(source, target);

    return this;
  }

  initPackageJson(
    dir: string,
    pulumiProgram: string,
    pulumiSdk = "@pulumi/pulumi",
    pulumiVersion: string = (getPackageInfo().dependencies || {})[pulumiSdk]
  ): this {
    const editor = this.fileInitializer.editJsonFile({
      targetPath: path.join(dir, "package.json"),
      description:
        "Add additional npm dependencies and declare the pulumi program runtime",
    });

    const main = editor.get("main");
    const conflictingMain = main && main !== pulumiProgram;

    editor.set("main", pulumiProgram);
    editor.set(`devDependencies.${pulumiSdk}`, pulumiVersion);
    editor.save({
      canSkip: true,
      challenge: conflictingMain,
      warning: conflictingMain
        ? `This will change the 'main' entry from ${main} to ${pulumiProgram}`
        : undefined,
    }); //Adds a step to the initializer if the above modifications contribute to a file change.
    return this;
  }

  createConfiguration(meteorDirectory: string) {

  }

  addProject({
    meteorDirectory = process.cwd(),
    projectName = getDefaultProjectName(meteorDirectory),
    description = getDefaultDescription(),
    developmentMode = false,
    pulumiProgram = "pulumi.js",
  }: {
    projectName?: string;
    description?: string;
    meteorDirectory?: string;
    developmentMode?: boolean;
    pulumiProgram?: string;
    skipConfiguration?: boolean;
  } = {}): this {
    if (!fileProber.exists(path.join(meteorDirectory, ".meteor"))) {
      throw new Error(`'${meteorDirectory}' is not a valid meteor project`);
    }

    return this.addMeteorIgnore(meteorDirectory, [pulumiProgram])
      .addDockerIgnore(meteorDirectory, [pulumiProgram])
      .addResourceFiles(
        meteorDirectory,
        { "index.js": pulumiProgram },
        developmentMode
      )
      .addPulumiYaml(meteorDirectory, { name: projectName, description })
      .initPackageJson(meteorDirectory, pulumiProgram);
  }
}
