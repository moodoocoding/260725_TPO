import assert from "node:assert/strict";
import test from "node:test";

import { isElapsedSecondsWithinLimit } from "../lib/score-request.ts";

test("경과 시간은 0부터 에피소드 제한 시간 사이의 정수만 허용한다", () => {
  assert.equal(isElapsedSecondsWithinLimit(0, 90), true);
  assert.equal(isElapsedSecondsWithinLimit(90, 90), true);
  assert.equal(isElapsedSecondsWithinLimit(-1, 90), false);
  assert.equal(isElapsedSecondsWithinLimit(91, 90), false);
  assert.equal(isElapsedSecondsWithinLimit(1.5, 90), false);
  assert.equal(isElapsedSecondsWithinLimit(Number.NaN, 90), false);
  assert.equal(isElapsedSecondsWithinLimit("10", 90), false);
});
