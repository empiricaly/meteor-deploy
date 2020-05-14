import { createResourceNames } from "./routing";
import { describeFile, describeFn } from "/src/test-utils";
import { it, expect } from "@jest/globals";
import assert from "assert";

describeFile(__filename, () => {
  describeFn(createResourceNames, () => {
    it("should work with empty objects", () => {
      assert.deepStrictEqual(createResourceNames("whatever", {}, 5), {});
    });

    it("should not produce names that are longer than permitted", () => {
      const actual = createResourceNames(
        "test-123",
        { foo: "-bar", baz: "-holy-cow" },
        15
      );
      const expected = {
        foo: "ts-123-bar",
        baz: "ts-123-holy-cow",
      };
      assert.deepStrictEqual(actual, expected);
    });

    it("should through an error when it cannot comply with max-length restriction", () => {
      expect(() => {
        createResourceNames("test-123", { foo: "bar" }, 1);
      }).toThrow("Cannot generate names with maximum length");
    });
  });
});
