import { describeFile, describeFn } from "/src/test-utils";
import { deviceName } from "./device-name";
import { it } from "@jest/globals";
import assert from "assert";

describeFile(__filename, () => {
  describeFn(deviceName, () => {
    it("should return a name with a single char suffixes for low index numbers", () => {
      assert.equal(deviceName(0), "/dev/xvda");
      assert.equal(deviceName(1), "/dev/xvdb");
      assert.equal(deviceName(25), "/dev/xvdz");
    });

    it("should return a name with a multi char suffix for index numbers", () => {
      assert.equal(deviceName(26), "/dev/xvdaa");
      assert.equal(deviceName(27), "/dev/xvdab");
      assert.equal(deviceName(51), "/dev/xvdaz");
      assert.equal(deviceName(52), "/dev/xvdba");
      assert.equal(deviceName(53), "/dev/xvdbb");
      assert.equal(deviceName(675), "/dev/xvdyz");
      assert.equal(deviceName(676), "/dev/xvdza");
      assert.equal(deviceName(701), "/dev/xvdzz");
      assert.equal(deviceName(702), "/dev/xvdaaa");
      assert.equal(deviceName(703), "/dev/xvdaab");
      assert.equal(deviceName(234324), "/dev/xvdmhpm");
    });

    it("should offset from the first character", () => {
      assert.equal(deviceName(1, "booo"), "boop");
      assert.equal(deviceName(26, "booo"), "booao");
      assert.equal(deviceName(0, "/dev/xvdb"), "/dev/xvdb");
      assert.equal(deviceName(1, "/dev/xvdb"), "/dev/xvdc");
    });
  });
});
