import {
  Config,
  Output,
  output,
  StringConfigOptions,
  NumberConfigOptions,
} from "@pulumi/pulumi";
import * as schema from "./schema";
import { JsonableArray, JsonableObj } from "./jsonable";

type ConfigPath = [string, ...string[]];

interface Getter<T> {
  get(config: Config, key: string): T | undefined;
  require(config: Config, key: string): T;
}

const objectGetter = {
  get<T extends JsonableObj = JsonableObj>(
    config: Config,
    key: string
  ): T | undefined {
    return config.getObject<T>(key);
  },
  require<T extends JsonableObj = JsonableObj>(config: Config, key: string): T {
    return config.requireObject<T>(key);
  },
};

const secretGetter = {
  get<T extends JsonableObj = JsonableObj>(
    config: Config,
    key: string
  ): Output<T | undefined> {
    return config.getSecretObject<T>(key) as Output<T | undefined>;
  },
  require<T extends JsonableObj = JsonableObj>(
    config: Config,
    key: string
  ): Output<T> {
    return config.requireSecretObject<T>(key);
  },
};

function getField(
  obj?: Record<string, unknown>,
  ...path: ConfigPath
): unknown | undefined {
  return path.reduce<unknown>(
    (value, key) =>
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)[key]
        : undefined,
    obj
  );
}

abstract class Field<T, SchemaField extends schema.Field<T>> {
  protected abstract getter: Getter<T>;
  protected abstract secret: Getter<Output<T>>;

  constructor(public schema: SchemaField) {}

  private chooseGetter(
    fieldIsNested: boolean
  ): Getter<
    | T
    | Output<T>
    | JsonableObj
    | Output<JsonableObj>
    | Output<JsonableObj | undefined>
  > {
    return this.schema.isSecret
      ? fieldIsNested
        ? secretGetter
        : this.secret
      : fieldIsNested
      ? objectGetter
      : this.getter;
  }

  private getRootValue<T>(
    config: Config,
    getter: Getter<T>,
    key: string
  ): T | undefined {
    return this.schema.isRequired && this.schema.defaultValue !== undefined
      ? getter.require(config, key)
      : getter.get(config, key);
  }

  private applyDefaultValue(output: Output<T>): Output<T> {
    // XXX If T is not allowed to be undefined, then value will not be undefined, but typescript will complain about
    // assigning defaultValue, which can be undefined to value as a default parameter. Logically this is not possible.
    // Therefor the defaultValue is casted into T as a workaround.
    return output.apply((value = this.schema.defaultValue as T) => value as T);
  }

  private assertOutput(output: Output<unknown>): Output<T> {
    return output.apply((value = this.schema.defaultValue) => {
      return this.schema.assert(value);
    });
  }

  private getNestedValue(
    output: Output<JsonableObj | undefined>,
    ...path: ConfigPath
  ): Output<T> {
    return this.assertOutput(output.apply((value) => getField(value, ...path)));
  }

  getValue(config: Config, key: string, ...path: string[]): Output<T> {
    const isNested = path.length > 0;
    const getter = this.chooseGetter(isNested);
    const value = this.getRootValue(config, getter, key);

    const outputValue: Output<T | undefined | JsonableObj> = Output.isInstance(
      value
    )
      ? value
      : (Output.create(value) as Output<T | undefined | JsonableObj>);

    return isNested
      ? this.getNestedValue(
          outputValue as Output<JsonableObj | undefined>,
          ...(path as ConfigPath)
        )
      : this.applyDefaultValue(outputValue as Output<T>);
  }
}

export class StringField<
  T extends string | undefined = string | undefined
> extends Field<T, schema.StringField<T>> {
  protected getter = {
    get: (config: Config, key: string) =>
      config.get<NonNullable<T>>(key, this.getOptions()),
    require: (config: Config, key: string) =>
      config.require<NonNullable<T>>(key, this.getOptions()),
  };

  protected secret = {
    get: (config: Config, key: string) =>
      config.getSecret<NonNullable<T>>(key, this.getOptions()),
    require: (config: Config, key: string) =>
      config.requireSecret<NonNullable<T>>(key, this.getOptions()),
  };

  getOptions(): StringConfigOptions<NonNullable<T>> {
    return {
      pattern: this.schema.regex,
      minLength: this.schema.minLength,
      maxLength: this.schema.maxLength,
      allowedValues: this.schema.allowedValues,
    };
  }
}

export class NumberField<T extends number | undefined> extends Field<
  T,
  schema.NumberField<T>
> {
  protected getter = {
    get: (config: Config, key: string) =>
      config.getNumber(key, this.getOptions()),
    require: (config: Config, key: string) =>
      config.requireNumber(key, this.getOptions()),
  } as Getter<T>;

  protected secret = {
    get: (config: Config, key: string) =>
      config.getSecretNumber(key, this.getOptions()),
    require: (config: Config, key: string) =>
      config.requireSecretNumber(key, this.getOptions()),
  } as Getter<Output<T>>;

  getOptions(): NumberConfigOptions {
    return {
      min: this.schema.min,
      max: this.schema.max,
    };
  }
}

export class BooleanField<T extends boolean | undefined> extends Field<
  T,
  schema.Field<T>
> {
  protected getter = {
    get: (config: Config, key: string) => config.getBoolean(key),
    require: (config: Config, key: string) => config.requireBoolean(key),
  } as Getter<T>;

  protected secret = {
    get: (config: Config, key: string) => config.getSecretBoolean(key),
    require: (config: Config, key: string) => config.requireSecretBoolean(key),
  } as Getter<Output<T>>;
}

export class ObjectOrArrayField<
  T extends JsonableObj | JsonableArray | undefined
> extends Field<T, schema.ObjectOrArrayField<T>> {
  protected getter = {
    get: (config: Config, key: string) => config.getObject<NonNullable<T>>(key),
    require: (config: Config, key: string) =>
      config.requireObject<NonNullable<T>>(key),
  };

  protected secret = {
    get: (config: Config, key: string) =>
      config.getSecretObject<NonNullable<T>>(key),
    require: (config: Config, key: string) =>
      config.requireSecretObject<NonNullable<T>>(key),
  } as Getter<Output<T>>;
}

type WrapField<T> = T extends schema.StringField<infer U>
  ? StringField<U>
  : T extends schema.NumberField<infer U>
  ? NumberField<U>
  : T extends schema.BooleanField<infer U>
  ? BooleanField<U>
  : T extends schema.ObjectOrArrayField<infer U>
  ? ObjectOrArrayField<U>
  : T;

function wrapField<T>(field: T): WrapField<T> {
  if (field instanceof schema.StringField) {
    return new StringField<schema.ExtractFieldType<typeof field>>(
      field
    ) as WrapField<typeof field>;
  }

  if (field instanceof schema.ObjectOrArrayField) {
    return new ObjectOrArrayField<schema.ExtractFieldType<typeof field>>(
      field
    ) as WrapField<typeof field>;
  }

  if (field instanceof schema.NumberField) {
    return new NumberField(field) as WrapField<typeof field>;
  }

  if (field instanceof schema.BooleanField) {
    return new BooleanField(field) as WrapField<typeof field>;
  }

  return field as WrapField<typeof field>;
}

type WrapSchemaField<T> = T extends schema.Field<infer F>
  ? WrapField<T>
  : T extends object
  ? WrapSchema<T>
  : T;

type WrapSchema<T extends object> = Required<
  {
    [K in keyof T]: WrapSchemaField<T[K]>;
  }
>;

export function wrapSchema<T extends object>(schemaObj: T): WrapSchema<T> {
  return Object.assign(
    {},
    ...Object.entries(schemaObj).map(([key, value]) => ({
      [key]:
        value instanceof schema.Field ? wrapField(value) : wrapSchema(value),
    }))
  );
}

type GetConfig<T extends object> = Output<
  {
    [K in keyof T]: [T[K]] extends [Field<infer U, infer S>]
      ? U
      : T[K] extends object
      ? GetConfig<T[K]>
      : T[K];
  }
>;

export function getConfig<T extends object>(
  schema: T,
  config: Config,
  parentKeys: string[] = []
): GetConfig<T> {
  return output(
    Object.assign(
      {},
      ...Object.entries(schema).map(([key, value]) => {
        const path = [...parentKeys, key];
        return {
          [key]:
            value instanceof Field
              ? value.getValue(config, ...(path as ConfigPath))
              : typeof value === "object"
              ? getConfig(value, config, path)
              : value,
        };
      })
    )
  ) as GetConfig<T>;
}
