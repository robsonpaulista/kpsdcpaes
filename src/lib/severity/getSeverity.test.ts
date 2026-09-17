import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSeverity } from "./getSeverity";

describe("getSeverity", () => {
  it("higherIsBetter: good when value meets meta", () => {
    assert.equal(getSeverity(82, 82, "higherIsBetter"), "good");
    assert.equal(getSeverity(90, 82, "higherIsBetter"), "good");
  });

  it("higherIsBetter: warning in band below meta", () => {
    assert.equal(getSeverity(72, 82, "higherIsBetter"), "warning");
  });

  it("higherIsBetter: critical when far below meta", () => {
    assert.equal(getSeverity(60, 82, "higherIsBetter"), "critical");
  });

  it("lowerIsBetter: good at or under meta", () => {
    assert.equal(getSeverity(200, 300, "lowerIsBetter"), "good");
    assert.equal(getSeverity(300, 300, "lowerIsBetter"), "good");
  });

  it("lowerIsBetter: warning between meta and 2×", () => {
    assert.equal(getSeverity(450, 300, "lowerIsBetter"), "warning");
  });

  it("lowerIsBetter: critical at/above 2× meta", () => {
    assert.equal(getSeverity(1240, 300, "lowerIsBetter"), "critical");
  });

  it("lowerIsBetter: meta 0 treats any positive as critical", () => {
    assert.equal(getSeverity(0, 0, "lowerIsBetter"), "good");
    assert.equal(getSeverity(1, 0, "lowerIsBetter"), "critical");
  });

  it("returns neutral when value or meta missing", () => {
    assert.equal(getSeverity(null, 82), "neutral");
    assert.equal(getSeverity(68, null), "neutral");
    assert.equal(getSeverity(undefined, undefined), "neutral");
  });
});
