import {
  existsSync,
  realpathSync,
  copyFileSync,
  writeFileSync,
  appendFileSync,
  symlinkSync,
  readFileSync,
  unlinkSync,
  mkdirSync,
  statSync,
  constants,
} from "fs";

import { dirname } from "path";

import { humanizePath } from "./path";

import { createHash } from "crypto";

function getHash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest().toString();
}

function assertDirectory(filepath: string): void {
  const directory = dirname(filepath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

export interface FileProber {
  exists(path: string): boolean;
  realpath(path: string): string;
  isDirectory(path: string): boolean;
  isSymlink(path: string): boolean;
}

export const fileProber: FileProber = {
  exists(path: string): boolean {
    return existsSync(path);
  },

  realpath(path: string): string {
    return realpathSync(path);
  },

  isDirectory(path: string): boolean {
    return statSync(path).isDirectory();
  },

  isSymlink(path: string): boolean {
    return this.realpath(path) !== path;
  },
};

export interface FileReader {
  readTextFile(path: string): string;
  readFileLines(path: string): string[];
  fileIsIdentical(params: { file: string; sourcePath: string }): boolean;
  fileIsIdentical(params: { file: string; source: string | Buffer }): boolean;
}

export const fileReader: FileReader = {
  readTextFile(path: string): string {
    return readFileSync(path, { encoding: "utf-8" });
  },
  readFileLines(file: string): string[] {
    return this.readTextFile(file).split("\n");
  },

  fileIsIdentical({
    file,
    sourcePath,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    source = sourcePath! && readFileSync(sourcePath!),
  }: { file: string } & (
    | {
        source: string | Buffer;
        sourcePath?: never;
      }
    | {
        sourcePath: string;
        source?: string | Buffer;
      }
  )): boolean {
    return getHash(readFileSync(file)) === getHash(source);
  },
};

export interface FileWriter {
  copyFile(src: string, dest: string, allowOverwrite?: boolean): void;
  writeTextFile(path: string, content: string, allowOverwrite?: boolean): void;
  appendTextFile(path: string, content: string): void;
  deleteFile(path: string): void;
}

export const fileWriter: FileWriter = {
  copyFile(src: string, dest: string, allowOverwrite = false): void {
    assertDirectory(dest);
    copyFileSync(
      src,
      dest,
      allowOverwrite ? undefined : constants.COPYFILE_EXCL
    );
  },
  writeTextFile(path: string, content: string, allowOverwrite = false): void {
    assertDirectory(path);
    writeFileSync(path, content, {
      flag: allowOverwrite ? "w" : "wx",
    });
  },
  appendTextFile(path: string, content: string): void {
    appendFileSync(path, content);
  },

  deleteFile(path: string): void {
    unlinkSync(path);
  },
};

export interface FileLinker {
  /**
   *
   * @param existingPath The path to the file or directory that the link should lead to.
   * @param linkPath The path at which the link should be create.
   * @param allowOverwrite Whether or not to attempt overwrite whatever is already present at linkPath.
   */

  createSymlink(
    existingPath: string,
    linkPath: string,
    allowOverwrite?: boolean
  ): void;
}

export const fileLinker: FileLinker = {
  createSymlink(
    existingPath: string,
    linkPath: string,
    allowOverwrite?: boolean
  ): void {
    assertDirectory(linkPath);

    if (allowOverwrite && existsSync(linkPath)) {
      unlinkSync(linkPath);
    }

    symlinkSync(existingPath, linkPath);
  },
};

function bindMethods<T extends object>(instance: T): T {
  const properties = Object.getOwnPropertyNames(
    Object.getPrototypeOf(instance) as T
  ) as (keyof T)[];

  return Object.assign(
    {},
    ...(properties.map((key) => [key, instance[key]]) as [
      keyof T,
      T[keyof T]
    ][]).map(([key, property]) => ({
      [key]:
        typeof property === "function" ? property.bind(instance) : property,
    }))
  );
}

export class FilesystemSimulator implements FileWriter, FileLinker {
  static create<T extends FileProber>(fs: T): T & FileLinker & FileWriter {
    const simulator = new this(fs);

    return {
      ...fs,
      ...bindMethods(simulator),
    };
  }

  constructor(
    private fs: FileProber = fileProber,
    private log: (message: string) => void = console.log,
    private cwd = process.cwd()
  ) {}

  protected humanize(path: string): string {
    return humanizePath(path, this.cwd);
  }

  protected simulateOp(description: string): void {
    this.log(`Would execute: ${description}`);
  }

  protected failOpIfExists(description: string, path: string): void {
    if (this.fs.exists(path)) {
      throw new Error(
        `Cannot carry out file operation: "${description}", because a file already exists at ${this.humanize(
          path
        )}.`
      );
    }
  }

  copyFile(src: string, dest: string, allowOverwrite = false): void {
    const description = `Copy file from '${this.humanize(
      src
    )}' to '${this.humanize(dest)}'`;

    allowOverwrite || this.failOpIfExists(description, dest);

    this.simulateOp(description);
  }

  writeTextFile(path: string, content: string, allowOverwrite = false): void {
    const description = `Create text file '${this.humanize(path)}'`;

    allowOverwrite || this.failOpIfExists(description, path);

    this.simulateOp(description);
  }

  appendTextFile(path: string): void {
    const description = `Modify text file '${path}'`;

    this.simulateOp(description);
  }

  createSymlink(
    target: string,
    linkPath: string,
    allowOverwrite = false
  ): void {
    const description = `Create link to '${this.humanize(
      target
    )}' at '${this.humanize(linkPath)}'`;

    allowOverwrite || this.failOpIfExists(description, linkPath);

    this.simulateOp(description);
  }

  deleteFile(path: string): void {
    this.simulateOp(`Delete file at '${this.humanize(path)}`);
  }
}
