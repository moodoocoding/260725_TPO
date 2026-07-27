import assert from "node:assert/strict";
import test from "node:test";

import { getRemainingSeconds } from "../lib/game-timer.ts";

test("타이머는 남은 초를 올림하고 마감 뒤에는 0으로 고정한다", () => {
  const startedAt = 10_000;
  const deadlineAt = startedAt + 90_000;

  assert.equal(getRemainingSeconds(deadlineAt, startedAt), 90);
  assert.equal(getRemainingSeconds(deadlineAt, deadlineAt - 1), 1);
  assert.equal(getRemainingSeconds(deadlineAt, deadlineAt), 0);
  assert.equal(getRemainingSeconds(deadlineAt, deadlineAt + 10_000), 0);
  assert.equal(getRemainingSeconds(0, startedAt), 0);
});
