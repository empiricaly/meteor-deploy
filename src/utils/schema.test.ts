import {
  ArrayField,
  NumberField,
  Schema,
  StringField,
  validate,
} from "./schema";
import { describeClass, describeFile, describeFn } from "/src/test-utils";
import { it } from "@jest/globals";
import assert from "assert";

describeFile(__filename, () => {
  describeClass(ArrayField, () => {
    describeFn(ArrayField.prototype.isType, () => {
      it("should validate generic arrays", () => {
        const field = ArrayField.required();
        assert.strictEqual(field.isType({}), false);
        assert.strictEqual(field.isType(false), false);
        assert.strictEqual(field.isType(true), false);
        assert.strictEqual(field.isType(1), false);
        assert.strictEqual(field.isType("foo"), false);
        assert.strictEqual(field.isType(null), false);
        assert.strictEqual(field.isType(undefined), false);

        assert.strictEqual(field.isType([]), true);
        assert.strictEqual(field.isType([[]]), true);
        assert.strictEqual(field.isType([false]), true);
        assert.strictEqual(field.isType([true]), true);
        assert.strictEqual(field.isType([1]), true);
        assert.strictEqual(field.isType(["foo"]), true);
        assert.strictEqual(field.isType([null]), true);
        assert.strictEqual(field.isType([undefined]), true);
      });

      it("should validate arrays of strings", () => {
        const field = ArrayField.required<[string]>(StringField.required());
        assert.strictEqual(field.isType([]), true);
        assert.strictEqual(field.isType(["foo", "bar"]), true);
        assert.strictEqual(field.isType([""]), true);

        assert.strictEqual(field.isType("not an array"), false);
        assert.strictEqual(field.isType([0]), false);
        assert.strictEqual(field.isType([1]), false);
        assert.strictEqual(field.isType([[]]), false);
        assert.strictEqual(field.isType([[""]]), false);
        assert.strictEqual(field.isType([{}]), false);
        assert.strictEqual(field.isType(["foo bar", 0]), false);
        assert.strictEqual(field.isType(["foo bar", 1]), false);
        assert.strictEqual(field.isType(["foo bar", []]), false);
        assert.strictEqual(field.isType(["foo bar", [""]]), false);
        assert.strictEqual(field.isType(["foo bar", {}]), false);
      });

      it("should validate arrays of numbers", () => {
        const field = ArrayField.required<[number]>(NumberField.required());
        assert.strictEqual(field.isType([]), true);
        assert.strictEqual(field.isType([0]), true);
        assert.strictEqual(field.isType([1]), true);
        assert.strictEqual(field.isType([1, 2, 3]), true);

        assert.strictEqual(field.isType(1), false);
        assert.strictEqual(field.isType(["5"]), false);
        assert.strictEqual(field.isType([[]]), false);
        assert.strictEqual(field.isType([[""]]), false);
        assert.strictEqual(field.isType([{}]), false);
        assert.strictEqual(field.isType([6, "0"]), false);
        assert.strictEqual(field.isType([6, "1"]), false);
        assert.strictEqual(field.isType([6, []]), false);
        assert.strictEqual(field.isType([6, [""]]), false);
        assert.strictEqual(field.isType([6, {}]), false);
      });

      it("should validate arrays of generic arrays", () => {
        const field = ArrayField.required<[[]]>(ArrayField.required());
        assert.strictEqual(field.isType([]), true);
        assert.strictEqual(field.isType([[0], ["foo", "bar"]]), true);
        assert.strictEqual(field.isType([[1]]), true);
        assert.strictEqual(field.isType([[1, 2, 3]]), true);

        assert.strictEqual(field.isType([0]), false);
        assert.strictEqual(field.isType([1]), false);
        assert.strictEqual(field.isType([1, 2, 3]), false);
      });

      it("should validate arrays of objects of a given schema", () => {
        const field = ArrayField.required<[{ foo: "bar" }]>({
          foo: StringField.required<"bar">().allowed("bar"),
        });
        assert.strictEqual(field.isType([]), true);

        assert.strictEqual(
          field.isType([
            {
              foo: "bar",
            },
          ]),
          true
        );

        assert.strictEqual(
          field.isType([
            {
              foo: "bar",
            },
            {
              foo: "bar",
            },
          ]),
          true
        );

        assert.strictEqual(field.isType([{}]), false);
        assert.strictEqual(field.isType(["foo bar"]), false);
      });
    });
  });

  describeFn(validate, () => {
    it("should validate simple objects", () => {
      assert.strictEqual(validate({}, {}), true);
      assert.strictEqual(validate({ foo: "bar" }, { foo: "bar" }), true);

      assert.strictEqual(validate({ foo: "bar" }, { foo: "baz" }), false);
      assert.strictEqual(validate({ foo: "bar" }, {}), false);
      assert.strictEqual(validate({ foo: "bar" }, { cow: "bar" }), false);

      assert.strictEqual(
        validate({ foo: StringField.required() }, { foo: "bar" }),
        true
      );

      assert.strictEqual(validate({ foo: StringField.required() }, {}), false);

      assert.strictEqual(validate({ foo: StringField.optional() }, {}), true);
    });

    it("should allow extra properties", () => {
      assert.strictEqual(
        validate({ foo: "bar" }, { foo: "bar", cow: "moo" }),
        true
      );

      assert.strictEqual(
        validate({ foo: StringField.required() }, { foo: "bar", cow: "moo" }),
        true
      );
    });

    it("should validate arrays of objects", () => {
      type Element = { bar: string; cow: string };
      const elementSchema: Schema<Element> = {
        bar: StringField.required(),
        cow: StringField.required(),
      };

      assert.strictEqual(
        validate(
          {
            foo: ArrayField.optional<Element[]>(elementSchema),
          },
          {
            foo: [
              {
                bar: "baz",
                cow: "moo",
              },
              {
                bar: "bar",
                cow: "wuf",
              },
            ],
          }
        ),
        true
      );

      assert.strictEqual(
        validate(
          {
            foo: ArrayField.optional<Element[]>(elementSchema),
          },
          {}
        ),
        true
      );

      assert.strictEqual(
        validate(
          {
            foo: ArrayField.required<Element[]>(elementSchema),
          },
          {}
        ),
        false
      );
    });
  });
});
