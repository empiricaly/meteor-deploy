import editJsonFile from "edit-json-file";
import { CoreInitializer } from "./core";
import { InitializationStep, InitializationStepType } from "./utils";
import { Wrapper } from "./wrapper";

import {
  CONFIG_FORMATTERS,
  CONFIGURATION_FORMAT,
  FileProber,
  FileWriter,
  FileReader,
  getFormatFromPath,
  humanizePath,
  Indent,
  isDestructiveConfigurationChange,
  Jsonable,
  JsonableObj,
  FileLinker,
  fileProber,
  fileReader,
  FilesystemSimulator,
  fileWriter,
  fileLinker,
  readConfig,
  requireFormatFromPath,
  JsonablePrimitive,
} from "/src/utils";

type AddTextFileOptions = { warning?: string | null } & Pick<
  InitializationStep,
  "targetPath" | "description"
>;

export type Filesystem = FileReader & FileProber & FileWriter & FileLinker;

export class FileInitializer extends Wrapper<CoreInitializer> {
  static createFilesystem(simulation = false): Filesystem {
    const fs = { ...fileProber, ...fileReader };
    return simulation
      ? FilesystemSimulator.create(fs)
      : {
          ...fs,
          ...fileWriter,
          ...fileLinker,
        };
  }

  static create(
    simulation?: boolean,
    core = new CoreInitializer()
  ): FileInitializer {
    return new this(core, this.createFilesystem(simulation));
  }

  constructor(core: CoreInitializer, private fs: Filesystem) {
    super(core);
  }

  addIgnoreEntries(entries: string[], ignoreFile: string): this {
    if (!this.fs.exists(ignoreFile)) {
      this.core.addStep({
        type: "Create File",
        targetPath: ignoreFile,
        description: `With entries: ${entries.join(", ")}`,
        run: (): void => {
          this.fs.writeTextFile(ignoreFile, entries.join("\n"));
        },
      });
    } else {
      const existingEntries = this.fs
        .readFileLines(ignoreFile)
        .map((entry) => entry.trim());

      const lookup = new Set(existingEntries);
      const entriesToAdd = entries.filter((entry) => !lookup.has(entry));

      if (entriesToAdd.length > 0)
        this.core.addStep({
          type: "Modify File",
          targetPath: ignoreFile,
          description: `Add entries: ${entriesToAdd.join(", ")}`,
          run: (): void => {
            this.fs.appendTextFile(
              ignoreFile,
              (existingEntries.length > 0 ? "\n" : "") + entriesToAdd.join("\n")
            );
          },
        });
    }
    return this;
  }

  installFile(src: string, dest: string, symbolicLink: boolean): this {
    let canSkip = false;
    let description = symbolicLink ? `Link to ${src}` : `Copy from ${src}`;
    let type: InitializationStepType = symbolicLink
      ? "Link File"
      : "Create File";

    let warn = false;

    let overwrite = false;

    if (this.fs.exists(dest)) {
      overwrite = true;
      if (symbolicLink) {
        const linkTo = this.fs.realpath(dest);
        if (linkTo === src) {
          return this;
        }

        if (linkTo === dest) {
          warn = true;
        }

        canSkip = true;
        description = `Overwrite original file with a link to ${humanizePath(
          src
        )}`;
      } else {
        if (
          !this.fs.isSymlink(dest) &&
          this.fs.fileIsIdentical({ file: dest, sourcePath: src })
        ) {
          return this;
        }

        type = "Modify File";
        canSkip = true;
        description = `Overwrite original file with ${humanizePath(src)}`;
        warn = true;
      }
    }

    this.core.addStep({
      type,
      targetPath: dest,
      description,
      canSkip,
      warning: warn
        ? "This will overwrite all contents of the existing file"
        : undefined,
      challenge: warn,
      run: symbolicLink
        ? (): void => this.fs.createSymlink(src, dest, overwrite)
        : (): void => {
            if (overwrite && this.fs.isSymlink(dest)) {
              this.fs.deleteFile(dest);
            }
            this.fs.copyFile(src, dest, overwrite);
          },
    });
    return this;
  }

  addTextFile(
    text: string,
    {
      targetPath,
      description,
      warning = "This will overwrite all contents of the existing file",
    }: AddTextFileOptions
  ): this {
    const fileExists = this.fs.exists(targetPath);
    const overwrite =
      fileExists &&
      !this.fs.fileIsIdentical({ file: targetPath, source: text });

    if (!fileExists || overwrite) {
      this.core.addStep({
        type: overwrite ? "Modify File" : "Create File",
        targetPath,
        description,
        canSkip: overwrite,
        warning: overwrite ? warning : undefined,
        run: (): void => {
          this.fs.writeTextFile(targetPath, text, overwrite);
        },
      });
    }
    return this;
  }

  addConfigFile(
    config: Jsonable,
    {
      targetPath,
      description = "Write configuration",
      format = getFormatFromPath(targetPath),
      indent = Indent.Default,
      ...options
    }: Omit<AddTextFileOptions, "description"> & {
      format?: CONFIGURATION_FORMAT;
      indent: Indent;
      description?: AddTextFileOptions["description"];
    }
  ): this {
    const formatter = format && CONFIG_FORMATTERS[format];

    if (!formatter) {
      throw new Error(`Unknown format '${format}'`);
    }

    const fileContent = formatter(config, indent);

    return this.addTextFile(fileContent, {
      targetPath,
      description,
      ...options,
    });
  }

  extendConfig(
    targetPath: string,
    extend: (existingConfig: JsonableObj) => JsonableObj,
    options?: Omit<
      Parameters<this["addConfigFile"]>[1],
      "targetPath" | "indent"
    >
  ): this {
    const existingFile =
      this.fs.exists(targetPath) && this.fs.readTextFile(targetPath);

    const indent =
      (existingFile && Indent.detectFromContent(existingFile)) ||
      Indent.Default;

    const format = requireFormatFromPath(targetPath);

    const currentConfig = existingFile
      ? readConfig(targetPath, format, {
          content: existingFile,
        })
      : {};

    const extendedConfig = extend(
      typeof currentConfig !== "object" ||
        currentConfig === null ||
        currentConfig instanceof Array
        ? {}
        : currentConfig
    );

    return this.addConfigFile(extendedConfig, {
      ...options,
      targetPath,
      indent,
      warning: isDestructiveConfigurationChange(currentConfig, extendedConfig)
        ? "This will overwrite your existing configuration"
        : null, // No warning.
    });
  }

  addDirectoryLink(srcDir: string, targetDir: string): this {
    if (!this.fs.isDirectory(srcDir)) {
      throw new Error(
        `Cannot link directory '${humanizePath(
          srcDir
        )}, because it is not a directory`
      );
    }

    const targetExists = this.fs.exists(targetDir);

    if (targetExists) {
      if (!this.fs.isSymlink(targetDir)) {
        if (this.fs.realpath(targetDir) === this.fs.realpath(srcDir)) {
          // Nothing to be done here. The targetDir is already pointing to the sourceDir.
          return this;
        }

        const isDirectory = this.fs.isDirectory(targetDir);

        const fileType = isDirectory ? "directory" : "file";

        // There is some file or dir at the target path. This would need to be deleted.
        this.core.addStep({
          type: isDirectory ? "Delete Directory" : "Delete File",
          targetPath: targetDir,
          description: `Delete ${fileType} to make room for symbolic link to directory '${humanizePath(
            srcDir
          )}'`,
          canSkip: false,
          challenge: true,
          warning: `The ${fileType} and all of it's contents will be deleted`,
          run: () => this.fs.deleteFile(targetDir),
        });
      }
    }

    this.core.addStep({
      type: "Link Directory",
      targetPath: targetDir,
      description: `Add symbolic link to directory ${humanizePath(srcDir)}`,
      run: () => this.fs.createSymlink(srcDir, targetDir, targetExists),
    });

    return this;
  }

  editJsonFile({
    targetPath,
    indent = Indent.detectFromContent(this.fs.readTextFile(targetPath)) ||
      Indent.Default,
    ...options
  }: {
    targetPath: string;
    description: string;
    indent?: Indent;
  }): {
    set(path: string, value: JsonablePrimitive): void;
    get(path: string): unknown;
    save(moreOptions?: {
      canSkip?: boolean;
      challenge?: boolean;
      warning?: string;
    }): void;
  } {
    // eslint-disable-next-line @typescript-eslint/camelcase
    const editor = editJsonFile(targetPath, { stringify_width: indent.count });

    const changes: Record<string, JsonablePrimitive> = {};

    return {
      set: (path, value) => {
        changes[path] = value;
      },
      get: (path: string) => editor.get(path),
      save: (moreOptions = {}) => {
        const modifications = Object.entries(changes)
          // XXX this will trigger initialization steps when non-primitive values are being handled.
          // Therefore we only allow JsonableRaw on the interface.
          .filter(([path, value]) => value !== editor.get(path))
          .map(([path, value]) => editor.set(path, value));

        if (modifications.length > 0) {
          this.core.addStep({
            type: "Modify File",
            targetPath,
            ...options,
            ...moreOptions,
            run: () => editor.save(),
          });
        }
      },
    };
  }
}
