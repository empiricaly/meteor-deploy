import { Jsonable, JsonableArray, JsonableObj } from "./jsonable";

export interface CommanderOptionConfigurator<T> {
  readonly cliFlags?: string;
  commandOption(flagName: string, typeName?: string): this;
}

type IsRequired<T> = T extends undefined ? boolean : true;

export interface FieldProperties<T> {
  readonly defaultValue?: NonNullable<T>;
  readonly isSecret: boolean;
  readonly description?: string;
  readonly cliFlags?: string;
  readonly isRequired: boolean; //IsRequired<T>;
}

export abstract class Field<T>
  implements FieldProperties<T>, CommanderOptionConfigurator<T> {
  readonly defaultValue?: NonNullable<T>;
  readonly isSecret: boolean;
  readonly description?: string;
  readonly cliFlags?: string;
  readonly isRequired: boolean;

  declare ["constructor"]: new (props: FieldProperties<T>) => this;

  protected static defaultProperties = {
    isSecret: false,
  };

  constructor(
    props: Partial<FieldProperties<T>> & { isRequired: IsRequired<T> }
  ) {
    const { defaultValue, isSecret, description, cliFlags, isRequired } = {
      ...Field.defaultProperties,
      ...props,
    };

    this.defaultValue = defaultValue;
    this.isSecret = isSecret;
    this.description = description;
    this.cliFlags = cliFlags;
    this.isRequired = isRequired;
  }

  clone<U extends Field<T>>(override: Partial<FieldProperties<T>>): this {
    return new this.constructor({ ...this, ...override });
  }

  abstract required(): Field<NonNullable<T>>;
  abstract optional(): Field<T | undefined>;

  default(defaultValue: NonNullable<T>): this {
    if (!this.isType(defaultValue)) {
      throw new Error(
        "The value cannot be used as default, because it is invalid"
      );
    }
    return this.clone({ defaultValue });
  }

  secret(): this {
    return this.clone({ isSecret: true });
  }

  describe(description: string): this {
    return this.clone({ description });
  }

  commandOption(cliFlags: string): this {
    return this.clone({ cliFlags });
  }

  abstract stringifyValue(value: T | undefined): string;
  abstract parseValue(value: string): NonNullable<T>;

  abstract isType(value: unknown): value is NonNullable<T>;

  validate(value: unknown): value is T {
    return this.isType(value) || (value === undefined && !this.isRequired);
  }

  assert(value: unknown): T {
    if (!this.validate(value)) {
      throw new Error(`Value is invalid '${value}'`);
    }

    return value;
  }
}

export interface StringProperties<T extends string | undefined>
  extends FieldProperties<T> {
  readonly regex?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly allowedValues?: NonNullable<T>[];
}

export class StringField<T extends string | undefined = string | undefined>
  extends Field<T>
  implements StringProperties<T> {
  readonly regex?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly allowedValues?: NonNullable<T>[];

  declare ["constructor"]: new (props: StringProperties<T>) => this;

  static required<T extends string = string>(): StringField<T> {
    return new StringField<T>({ isRequired: true as IsRequired<T> });
  }

  static optional<T extends string = string>(): StringField<T | undefined> {
    return new StringField<T | undefined>({ isRequired: false });
  }

  constructor({
    regex,
    minLength,
    maxLength,
    allowedValues,
    ...props
  }: Partial<StringProperties<T>> & { isRequired: IsRequired<T> }) {
    super(props);
    this.regex = regex;
    this.minLength = minLength;
    this.maxLength = maxLength;
    this.allowedValues = allowedValues;
  }

  required(): StringField<NonNullable<T>> {
    return (this.clone({
      isRequired: true as IsRequired<T>,
    }) as unknown) as StringField<NonNullable<T>>;
  }

  optional(): StringField<T | undefined> {
    return (this.clone({
      isRequired: false as IsRequired<T>,
    }) as unknown) as StringField<T | undefined>;
  }

  clone(override: Partial<StringProperties<T>>): this {
    return super.clone(override);
  }

  allowed(...allowedValues: NonNullable<T>[]): this {
    if (!allowedValues.every((value) => this.isType(value))) {
      throw new Error("Some of the allowed values are not valid");
    }

    return this.clone({ allowedValues });
  }

  length({ min, max }: { min?: number; max?: number }): this {
    return this.clone({
      minLength: min,
      maxLength: max,
    });
  }

  pattern(regex: RegExp): this {
    return this.clone({ regex });
  }

  parseValue(value: string): NonNullable<T> {
    return value as NonNullable<T>;
  }

  stringifyValue(value: T): string {
    return (value as string | undefined) || "";
  }

  isType(value: unknown): value is NonNullable<T> {
    return (
      typeof value === "string" &&
      (!this.regex || this.regex.test(value)) &&
      (this.maxLength === undefined || value.length <= this.maxLength) &&
      (this.minLength === undefined || value.length >= this.minLength) &&
      (!this.allowedValues ||
        this.allowedValues.includes(value as NonNullable<T>))
    );
  }
}

export interface NumberProperties<T extends number | undefined>
  extends FieldProperties<T> {
  readonly min?: number;
  readonly max?: number;
}

export class NumberField<T extends number | undefined = number | undefined>
  extends Field<T>
  implements NumberProperties<T> {
  readonly min?: number;
  readonly max?: number;

  static required(): NumberField<number> {
    return new NumberField<number>({ isRequired: true });
  }

  static optional(): NumberField<number | undefined> {
    return new NumberField<number | undefined>({ isRequired: false });
  }

  declare ["constructor"]: new (props: NumberProperties<T>) => this;

  constructor(
    props: Partial<NumberProperties<T>> & { isRequired: IsRequired<T> }
  ) {
    const { min, max } = {
      ...props,
      ...NumberField.defaultProperties,
    };

    super(props);
    this.min = min;
    this.max = max;
  }

  clone(override: Partial<NumberProperties<T>>): this {
    return super.clone(override);
  }

  required(): NumberField<NonNullable<T>> {
    return (this.clone({
      isRequired: true as IsRequired<T>,
    }) as unknown) as NumberField<NonNullable<T>>;
  }

  optional(): NumberField<T | undefined> {
    return (this.clone({
      isRequired: false as IsRequired<T>,
    }) as unknown) as NumberField<T | undefined>;
  }

  parseValue(value: string): NonNullable<T> {
    return parseFloat(value) as NonNullable<T>;
  }

  stringifyValue(value: NonNullable<T>): string {
    return `${value}`;
  }

  range({ min, max }: { min?: number; max?: number }): this {
    return this.clone({ min, max });
  }

  isType(value: unknown): value is NonNullable<T> {
    return (
      typeof value === "number" &&
      (this.max === undefined || value <= this.max) &&
      (this.min === undefined || value >= this.min)
    );
  }
}

export class BooleanField<
  T extends boolean | undefined = boolean | undefined
> extends Field<T> {
  static required(): BooleanField<boolean> {
    return new BooleanField<boolean>({ isRequired: true });
  }

  static optional(): BooleanField<boolean | undefined> {
    return new BooleanField<boolean | undefined>({ isRequired: false });
  }

  required(): BooleanField<NonNullable<T>> {
    return (this.clone({
      isRequired: true as IsRequired<T>,
    }) as unknown) as BooleanField<NonNullable<T>>;
  }

  optional(): BooleanField<T | undefined> {
    return (this.clone({
      isRequired: false as IsRequired<T>,
    }) as unknown) as BooleanField<T | undefined>;
  }

  parseValue(value: string): NonNullable<T> {
    const yes = ["true", "on", "yes", "1", "y"];
    const no = ["false", "off", "no", "0", "n"];
    value = value.toLowerCase();

    if (yes.includes(value)) {
      return true as NonNullable<T>;
    }

    if (no.includes(value)) {
      return false as NonNullable<T>;
    }

    throw new Error(
      `'${value}' is not a recognized value. Did you mean '${yes.join(
        "', '"
      )}' or '${no.join("', '")}'?`
    );
  }

  stringifyValue(value: NonNullable<T>): string {
    return `${value}`;
  }

  isType(value: unknown): value is NonNullable<T> {
    return typeof value === "boolean";
  }
}

abstract class ObjectOrArrayField<
  T extends JsonableObj | JsonableArray | undefined
> extends Field<T> {
  required(): ObjectOrArrayField<NonNullable<T>> {
    return (this.clone({
      isRequired: true as IsRequired<T>,
    }) as unknown) as ObjectOrArrayField<NonNullable<T>>;
  }

  optional(): ObjectOrArrayField<T | undefined> {
    return (this.clone({
      isRequired: false as IsRequired<T>,
    }) as unknown) as ObjectOrArrayField<T | undefined>;
  }

  parseValue(value: string): NonNullable<T> {
    return JSON.parse(value);
  }

  stringifyValue(value: T): string {
    return JSON.stringify(value);
  }

  isType(value: unknown): value is NonNullable<T> {
    return typeof value === "object" && value !== null;
  }
}

export class ObjectField<
  T extends JsonableObj | undefined
> extends ObjectOrArrayField<T> {
  static required<T extends JsonableObj>(): ObjectOrArrayField<T> {
    return new ObjectField<T>({ isRequired: true as IsRequired<T> });
  }

  static optional<T extends JsonableObj>(): ObjectOrArrayField<T | undefined> {
    return new ObjectField<T | undefined>({ isRequired: false });
  }

  required(): ObjectField<NonNullable<T>> {
    return super.required();
  }

  optional(): ObjectField<T | undefined> {
    return super.optional();
  }

  isType(value: unknown): value is NonNullable<T> {
    return super.isType(value) && !Array.isArray(value);
  }
}

export function validate<Schema extends object>(
  schemaObject: Schema,
  obj: object
): obj is Data<Schema> {
  return Object.entries(schemaObject).every(([key, schemaObject]) => {
    const { [key]: value } = obj as Record<
      string,
      Field<unknown> | object | unknown
    >;
    if (schemaObject instanceof Field) {
      return schemaObject.validate(value);
    } else if (
      typeof schemaObject === "object" &&
      typeof value === "object" &&
      value !== null
    ) {
      return validate(schemaObject, value);
    } else {
      return schemaObject === value;
    }
  });
}

export type StringifiedData<T> = {
  [K in keyof T]: [T[K]] extends [Field<infer U>]
    ? string
    : T[K] extends object
    ? Data<T[K]>
    : T[K];
};

type ElementSchema<T extends JsonableArray | undefined> = [T] extends [
  (infer E)[] | undefined
]
  ? [E] extends [JsonableObj]
    ? ObjectOrArrayField<E> | Schema<E>
    : [E] extends [JsonableObj | undefined]
    ? ObjectOrArrayField<E>
    : Field<E>
  : never;

export interface ArrayProperties<T extends JsonableArray | undefined>
  extends FieldProperties<T> {
  readonly elementSchema?: ElementSchema<T>;
}

export class ArrayField<T extends JsonableArray | undefined>
  extends ObjectOrArrayField<T>
  implements ArrayProperties<T> {
  public readonly elementSchema?: ElementSchema<T>;

  static required<T extends JsonableArray>(): ArrayField<T> {
    return new ArrayField<T>({ isRequired: true as IsRequired<T> });
  }

  static optional<T extends JsonableArray>(): ArrayField<T | undefined> {
    return new ArrayField<T | undefined>({ isRequired: false });
  }

  constructor({
    elementSchema,
    ...props
  }: Partial<ArrayProperties<T>> & { isRequired: IsRequired<T> }) {
    super(props);
    this.elementSchema = elementSchema;
  }

  required(): ArrayField<NonNullable<T>> {
    return super.required() as ArrayField<NonNullable<T>>;
  }

  optional(): ArrayField<T | undefined> {
    return super.optional() as ArrayField<T | undefined>;
  }

  clone(override: Partial<ArrayProperties<T>>): this {
    return new this.constructor({ ...this, ...override });
  }

  element(elementSchema: ElementSchema<T>): this {
    return this.clone({ elementSchema });
  }

  validateElement(value: unknown): value is T extends (infer E)[] ? E : never {
    if (this.elementSchema === undefined) {
      throw new Error(
        "Cannot validate array elements without an array element schema"
      );
    }

    return this.elementSchema instanceof Field
      ? this.elementSchema.validate(value)
      : typeof value === "object" && value !== null
      ? validate(this.elementSchema, value)
      : false;
  }

  isType(value: unknown): value is NonNullable<T> {
    return (
      super.isType(value) &&
      Array.isArray(value) &&
      (this.elementSchema === undefined ||
        value.every((value) => this.validateElement(value)))
    );
  }
}

export type ExtractFieldType<F> = F extends Field<infer T> ? T : never;

/** Converts a schema object into a data type definition.
 *
 */

export type Data<T extends object> = {
  [K in keyof T]: [T[K]] extends [Field<infer U>]
    ? U
    : T[K] extends object
    ? Data<T[K]>
    : T[K];
};

export type SchemaType<T> = [T] extends [string | undefined]
  ? StringField<T>
  : [T] extends [number | undefined]
  ? NumberField<T>
  : [T] extends [boolean | undefined]
  ? BooleanField<T>
  : [T] extends [JsonableObj | undefined]
  ? ObjectField<T>
  : [T] extends [JsonableArray | undefined]
  ? ArrayField<T>
  : never;

/** Converts an object type definition into a Schema type definition.
 *
 * This effectively does the reverse of the Data<> operation.
 *
 */

export type Schema<T extends object> = Required<
  {
    [K in keyof T]: [T[K]] extends [JsonableObj]
      ? Schema<T[K]> | ObjectField<T[K]>
      : [T[K]] extends [object]
      ? Schema<T[K]>
      : SchemaType<T[K]>;
  }
>;

/** Same as schema, except that each nested object will always be defined as a sub-schema object.
 *
 */

export type OpinionatedSchema<T extends object> = Required<
  {
    [K in keyof T]: [T[K]] extends [object]
      ? OpinionatedSchema<T[K]>
      : SchemaType<T[K]>;
  }
>;
