import { it } from "mocha";
import { isDestructiveConfigurationChange } from "./config-files";
import { describeFile, describeFn } from "/src/test-utils";
import assert from "assert";

describeFile(__filename, () => {
  describeFn(isDestructiveConfigurationChange, () => {
    it("Should not consider extra properties as destructive", () => {
      assert.equal(isDestructiveConfigurationChange({}, { foo: "bar" }), false);
      assert.equal(
        isDestructiveConfigurationChange({}, { foo: { bar: "baz" } }),
        false
      );
      assert.equal(
        isDestructiveConfigurationChange([{}], [{ foo: { bar: "baz" } }]),
        false
      );

      assert.equal(
        isDestructiveConfigurationChange({ foo: {} }, { foo: { bar: "baz" } }),
        false
      );
    });

    it("Should consider missing properties as destructive", () => {
      assert.equal(isDestructiveConfigurationChange({ foo: "bar" }, {}), true);
      assert.equal(
        isDestructiveConfigurationChange({ foo: { bar: "baz" } }, { foo: {} }),
        true
      );
      assert.equal(
        isDestructiveConfigurationChange(
          { foo: "bar", cow: "moo" },
          { foo: "bar" }
        ),
        true
      );
      assert.equal(
        isDestructiveConfigurationChange([{ foo: "bar " }], [{}]),
        true
      );
    });

    it("Should not consider extra properties in objects nested in arrays as destructive", () => {
      assert.equal(
        isDestructiveConfigurationChange([{}], [{ foo: "bar" }]),
        false
      );
    });

    it("Should not consider equal raw types as destructive", () => {
      assert.equal(isDestructiveConfigurationChange({}, {}), false);
      assert.equal(isDestructiveConfigurationChange([], []), false);
      assert.equal(isDestructiveConfigurationChange(false, false), false);
      assert.equal(isDestructiveConfigurationChange(true, true), false);
      assert.equal(isDestructiveConfigurationChange(1, 1), false);
      assert.equal(isDestructiveConfigurationChange("hello", "hello"), false);
      assert.equal(isDestructiveConfigurationChange(null, null), false);
      assert.equal(
        isDestructiveConfigurationChange(undefined, undefined),
        false
      );
    });

    it("Should consider changed types as destructive", () => {
      assert.equal(isDestructiveConfigurationChange(false, 0), true);
      assert.equal(isDestructiveConfigurationChange(0, false), true);
      assert.equal(isDestructiveConfigurationChange(null, 0), true);
      assert.equal(isDestructiveConfigurationChange(0, null), true);
      assert.equal(isDestructiveConfigurationChange(false, ""), true);
      assert.equal(isDestructiveConfigurationChange("", false), true);
      assert.equal(isDestructiveConfigurationChange("1", 1), true);
      assert.equal(isDestructiveConfigurationChange(1, "1"), true);
      assert.equal(isDestructiveConfigurationChange(true, 1), true);
      assert.equal(isDestructiveConfigurationChange(1, true), true);
      assert.equal(isDestructiveConfigurationChange(null, undefined), true);
      assert.equal(isDestructiveConfigurationChange(undefined, null), true);
      assert.equal(isDestructiveConfigurationChange({}, []), true);
      assert.equal(isDestructiveConfigurationChange([], {}), true);
    });

    it("Should not consider an undefined property and a missing property as destructive", () => {
      assert.equal(
        isDestructiveConfigurationChange({ foo: undefined }, {}),
        false
      );
    });

    it("Should not consider identical arrays as destructive", () => {
      assert.equal(isDestructiveConfigurationChange(["foo"], ["foo"]), false);
      assert.equal(isDestructiveConfigurationChange([[]], [[]]), false);
    });

    it("Should consider arrays with re-arranged elements as destructive", () => {
      assert.equal(isDestructiveConfigurationChange([1, 2], [2, 1]), true);
    });

    it("Should consider arrays with missing or extra elements as destructive", () => {
      assert.equal(isDestructiveConfigurationChange([1, 2], [1]), true);
      assert.equal(isDestructiveConfigurationChange([1, 2], [1, 2, 3]), true);
    });

    it("Should consider arrays with different elements as destructive", () => {
      assert.equal(isDestructiveConfigurationChange([1], [2]), true);
      assert.equal(isDestructiveConfigurationChange([1, 2], [1, 3]), true);
      assert.equal(isDestructiveConfigurationChange([[]], [[1]]), true);
    });
  });
});
