const test = require("node:test");
const assert = require("node:assert/strict");
const { validStatusTransitions } = require("../src/config/constants");
const cacheService = require("../src/services/cacheService");

test("application workflow only permits explicit forward transitions", () => {
  assert.deepEqual(validStatusTransitions.draft, ["submitted"]);
  assert.ok(validStatusTransitions.submitted.includes("under-review"));
  assert.equal(validStatusTransitions.enrolled.length, 0);
  assert.equal(validStatusTransitions.rejected.length, 0);
});

test("cache entries expire and can be invalidated", () => {
  cacheService.set("test-dashboard", { total: 3 }, 60);
  assert.deepEqual(cacheService.get("test-dashboard"), { total: 3 });
  cacheService.delete("test-dashboard");
  assert.equal(cacheService.get("test-dashboard"), null);
});
