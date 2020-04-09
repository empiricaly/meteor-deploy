import { Indent } from "./indent";
import YAML from "js-yaml";
import { Jsonable } from "./jsonable";
import { fileReader, FileReader } from "./filesystem";
import { humanizePath } from "./path";

export const CONFIG_FORMATTERS = {
  json<T extends Jsonable>(config: T, indent: Indent): string {
    return JSON.stringify(config, null, indent.render());
  },
  yaml<T extends Jsonable>(config: T, { count: indent }: Indent): string {
    return YAML.safeDump(config, { indent, skipInvalid: true });
  },
};

export const CONFIG_PARSERS = {
  json<T>(str: string): T {
    return JSON.parse(str);
  },
  yaml<T>(str: string): T {
    return YAML.load(str);
  },
};

export type CONFIGURATION_FORMAT =
  | keyof typeof CONFIG_FORMATTERS
  | keyof typeof CONFIG_PARSERS;

export function getFormatFromPath(
  filepath: string
): CONFIGURATION_FORMAT | undefined {
  if (filepath.match(/\.json$/i)) {
    return "json";
  }

  if (filepath.match(/\.ya?ml$/i)) {
    return "yaml";
  }
}

export function isValidFormat(format: unknown): format is CONFIGURATION_FORMAT {
  return typeof format === "string" && CONFIG_PARSERS.hasOwnProperty(format);
}

export function requireFormatFromPath(filepath: string): CONFIGURATION_FORMAT {
  const format = getFormatFromPath(filepath);

  if (!isValidFormat(format)) {
    throw new Error(
      `Cannot parse the format '${format}' (for file '${humanizePath(
        filepath
      )}')`
    );
  }

  return format;
}

export function isDestructiveConfigurationChange(
  original: Jsonable,
  modified: Jsonable
): boolean {
  if (Array.isArray(original) && Array.isArray(modified)) {
    if (original.length !== modified.length) {
      return true;
    }

    return original.some((value: Jsonable, index: number) =>
      isDestructiveConfigurationChange(value, modified[index])
    );
  }

  if (Array.isArray(original) !== Array.isArray(modified)) {
    return true;
  }

  const type = typeof original;

  if (type !== typeof modified) {
    return true;
  }
  if (
    typeof original === "object" &&
    typeof modified === "object" &&
    original !== null &&
    modified !== null &&
    !(modified instanceof Array)
  ) {
    return Object.entries(original).some(
      ([key, value]) =>
        value !== undefined &&
        (modified.hasOwnProperty(key)
          ? isDestructiveConfigurationChange(value, modified[key])
          : true)
    );
  }

  return original !== modified;
}

export function readConfig<T extends Jsonable = Jsonable>(
  path: string,
  format = requireFormatFromPath(path),
  {
    fs,
    content,
  }:
    | { fs: FileReader; content?: undefined }
    | { content: string; fs?: undefined } = { fs: fileReader }
): T {
  const parser = CONFIG_PARSERS[format];

  if (fs) {
    content = fs.readTextFile(path);
  }

  if (content === undefined) {
    throw new Error("File-content cannot be undefined");
  }

  try {
    return parser(content);
  } catch (error) {
    throw new Error(
      `Could not parse ${humanizePath(path)}: ${
        error.stack || error
      }\nEncountered at:`
    );
  }
}
