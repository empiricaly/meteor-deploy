import { Command, Option } from "commander";
import * as schema from "./schema";
import { getAttributeName } from "./commander";

type CommandOption<T> = {
  flags: string;
  mandatory?: boolean;
  defaultValue?: string | boolean;
  regexp?: RegExp;
  description: string;
};

type WrappedField<T> = T extends schema.Field<infer U>
  ? CommanderField<U, T>
  : T;

type WrappedSchema<T extends object> = {
  [K in keyof T]: T[K] extends schema.Field<infer F>
    ? WrappedField<T[K]>
    : T[K] extends object
    ? WrappedSchema<T[K]>
    : T[K];
};

type Retrieve<T extends object> = {
  [K in keyof T]: T[K] extends CommanderField<infer U, infer S>
    ? U
    : T[K] extends object
    ? Retrieve<T[K]>
    : T[K];
};

export class CommanderField<T, SchemaField extends schema.Field<T>> {
  static wrapField<T>(field: T): WrappedField<T> {
    if (field instanceof schema.Field) {
      return new this(field) as WrappedField<typeof field>;
    }

    return field as WrappedField<typeof field>;
  }

  static wrapSchema<T extends object>(schemaObj: T): WrappedSchema<T> {
    return Object.assign(
      {},
      ...Object.entries(schemaObj).map(([key, value]) => ({
        [key]:
          value instanceof schema.Field
            ? this.wrapField(value)
            : this.wrapSchema(value),
      }))
    );
  }

  static configure<T extends object>(
    commanderObj: T,
    program: Command,
    parentKeys: string[] = []
  ): void {
    Object.entries(commanderObj).forEach(([key, value]) => {
      const path = [...parentKeys, key];
      return {
        [key]:
          value instanceof this
            ? value.configure(program, path.join("."))
            : this.configure(value, program, path),
      };
    });
  }

  static retrieve<T extends object>(
    commanderObj: T,
    program: Command,
    parentKeys: string[] = []
  ): Retrieve<T> {
    return Object.assign(
      {},
      ...Object.entries(commanderObj).map(([key, value]) => {
        const path = [...parentKeys, key];
        return {
          [key]:
            value instanceof this
              ? value.retrieve(program, path.join("."))
              : typeof value === "object"
              ? this.retrieve(value, program, path)
              : value,
        };
      })
    );
  }

  constructor(public schema: SchemaField) {}

  isMandatory() {
    return this.schema.isRequired && this.schema.defaultValue === undefined;
  }

  configure(program: Command, key: string): void {
    const commandOption = this.commandOption(key);

    if (!commandOption) {
      return;
    }

    const { flags, description, regexp, defaultValue } = commandOption;

    if (this.isMandatory()) {
      program.requiredOption(flags, description, regexp as RegExp);
    } else if (regexp) {
      program.option(flags, description, regexp, defaultValue);
    } else {
      program.option(flags, description, defaultValue);
    }
  }

  parseValue(value: string): T {
    return this.schema.parseValue(value);
  }

  stringifyValue(value: T): string {
    return this.schema.stringifyValue(value);
  }

  retrieve(program: Command, key: string): T | undefined {
    const commandOption = this.commandOption(key);

    if (!commandOption) {
      return undefined;
    }

    const { flags, description } = commandOption;
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore attributeName is private, but it is safer to use it than making assumptions about how commander
    const inputValue = program.opts()[getAttributeName(flags, description)];

    const value =
      typeof inputValue === "string" ? this.parseValue(inputValue) : inputValue;

    if (!this.schema.validate(value)) {
      const option = new Option(flags, description);
      throw new Error(`Invalid value provided for option '${option.long}'`);
    }

    return value;
  }

  commandOption(key: string): CommandOption<T> | null {
    const {
      defaultValue,
      isRequired: mandatory,
      description = `Value for '${key}'`,
      cliFlags: flags,
    } = this.schema;

    return flags
      ? {
          flags,
          mandatory,
          description,
          defaultValue:
            defaultValue &&
            typeof defaultValue !== "string" &&
            typeof defaultValue !== "boolean"
              ? this.stringifyValue(defaultValue)
              : (defaultValue as string | boolean | undefined),
        }
      : null;
  }

  protected defaultCommandOption(key: string): string {
    const flag = `--${key}`;

    return this.schema instanceof schema.BooleanField
      ? flag
      : `${flag} <value>`;
  }
}

export type ConfigRetriever<T extends Record<string, object>> = () => {
  [K in keyof T]: schema.Data<T[K]>;
};

export function createConfigRetriever<Map extends Record<string, object>>(
  program: Command,
  schemaMap: Map
): ConfigRetriever<typeof schemaMap> {
  const options: {
    [S in keyof Map]: WrappedSchema<Map[S]>;
  } = Object.assign(
    {},
    ...Object.entries(schemaMap).map(([key, schema]) => ({
      [key]: CommanderField.wrapSchema(schema),
    }))
  );

  Object.values(options).forEach((options) =>
    CommanderField.configure(options, program)
  );

  return () =>
    Object.assign(
      {},
      ...Object.entries(options).map(([key, options]) => ({
        [key]: CommanderField.retrieve(options, program),
      }))
    );
}
