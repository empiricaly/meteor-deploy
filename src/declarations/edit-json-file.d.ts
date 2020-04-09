declare module "edit-json-file" {
  export default function editJsonFile(
    path: string,
    options?: Options
  ): JsonEditor;

  export type Options = {
    /**
     * The JSON stringify indent width (default: `2`).
     */
    stringify_width?: number;
    /**
     * A function used by `JSON.stringify`.
     */
    stringify_fn?: Function;
    /**
     * Wheter to add the new line at the end of the file or not (default: `false`)
     */
    stringify_eol?: boolean;
    /**
     * Save the file when setting some data in it.
     */
    autosave?: boolean;
  };

  type Callback<T> = (error: Error | null, value?: T) => void;

  export interface JsonEditor {
    /**
     * set
     * Set a value in a specific path.
     *
     * @name set
     * @function
     * @param {String} path The object path.
     * @param {Jsonable} value The value.
     * @returns {JsonEditor} The `JsonEditor` instance.
     */
    set(path: string, value: unknown): this;

    /**
     * get
     * Get a value in a specific path.
     *
     * @name get
     * @function
     * @param {String} path
     * @returns {Value} The object path value.
     */
    get(path: string): unknown;

    /**
     * unset
     * Remove a path from a JSON object.
     *
     * @name unset
     * @function
     * @param {String} path The object path.
     * @returns {JsonEditor} The `JsonEditor` instance.
     */
    unset(path: string): this;

    /**
     * read
     * Read the JSON file.
     *
     * @name read
     * @function
     * @param {Function} cb An optional callback function which will turn the function into an asynchronous one.
     * @returns {Object} The object parsed as object or an empty object by default.
     */
    read(cb?: Callback<object>): object;

    /**
     * write
     * Write the JSON file.
     *
     * @name read
     * @function
     * @param {String} content The file content.
     * @param {Function} cb An optional callback function which will turn the function into an asynchronous one.
     * @returns {JsonEditor} The `JsonEditor` instance.
     */
    write(content: string, cb?: Callback<void>): this;

    /**
     * empty
     * Empty the JSON file content.
     *
     * @name empty
     * @function
     * @param {Function} cb The callback function.
     */
    empty(cb?: Callback<void>): this;

    /**
     * save
     * Save the file back to disk.
     *
     * @name save
     * @function
     * @param {Function} cb An optional callback function which will turn the function into an asynchronous one.
     * @returns {JsonEditor} The `JsonEditor` instance.
     */
    save(cb?: Callback<void>): this;

    /**
     * toObject
     *
     * @name toObject
     * @function
     * @returns {Object} The data object.
     */
    toObject(): object;
  }
}
