// undefined is still json'able as any keys set to undefined are truncated.
export type JsonablePrimitive = string | number | boolean | null | undefined;

export type JsonableArray = Jsonable[];

export interface JsonableObj {
  [key: string]: JsonableObj | JsonablePrimitive | JsonableArray;
}

export type Jsonable = JsonableObj | JsonablePrimitive | JsonableArray;
