import { removeIndent } from "./remove-indent";
import { describeFile, describeFn } from "/src/test-utils";
import assert from "assert";
import { it } from "@jest/globals";

describeFile(__dirname, () => {
  describeFn(removeIndent, () => {
    it("should remove the smallest common indent", () => {
      assert.equal(removeIndent(""), "");
      assert.equal(removeIndent("a"), "a");
      assert.equal(removeIndent(" b"), "b");
      assert.equal(removeIndent("\nc"), "\nc");
      assert.equal(removeIndent("\n d"), "\nd");
      assert.equal(removeIndent("\n e\n  f"), "\ne\n f");
      assert.equal(removeIndent("\n  g\n h"), "\n g\nh");
      assert.equal(removeIndent("\n  i\n  j"), "\ni\nj");
      assert.equal(removeIndent("\n k\n\n l"), "\nk\n\nl");
      assert.equal(removeIndent("\n   m\n \n   n"), "\nm\n\nn");
    });

    it("should trim empty lines", () => {
      assert.equal(removeIndent(" "), "");
      assert.equal(removeIndent("    \nhello"), "\nhello");
      assert.equal(removeIndent("hello\n \nworld"), "hello\n\nworld");
      assert.equal(removeIndent("hello\n    "), "hello\n");
    });
  });
});
