import assert from "node:assert/strict";
import test from "node:test";

import {
  loadStoryProgress,
  parseStoryProgress,
  readStorageNumber,
  writeStorageValues,
} from "../lib/progress-storage.ts";

const episodeSlugs = new Set(["episode-1", "episode-2"]);
const chapterIds = new Set(["chapter-1", "chapter-2"]);

function progress(version = 3) {
  return JSON.stringify({
    version,
    episodes: {
      "episode-1": { bestScore: 81, stars: 2, completed: false },
      unknown: { bestScore: 100, stars: 3, completed: true },
    },
    seenChapterOpenings: ["chapter-1", "unknown"],
    seenChapterEndings: ["chapter-2"],
  });
}

test("손상된 v3 진행도 대신 정상적인 v2 진행도를 복구한다", () => {
  const values = new Map([
    ["v3", "{broken"],
    ["v2", progress(2)],
  ]);
  const result = loadStoryProgress(
    () => ({
      getItem: (key) => values.get(key) ?? null,
      setItem: () => {},
    }),
    ["v3", "v2"],
    episodeSlugs,
    chapterIds,
  );

  assert.equal(result.storageAvailable, true);
  assert.equal(result.progress.episodes["episode-1"].bestScore, 81);
  assert.equal(result.progress.episodes["episode-1"].completed, true);
  assert.deepEqual(result.progress.seenChapterOpenings, []);
});

test("진행도 파서는 허용된 에피소드와 챕터만 복구한다", () => {
  const parsed = parseStoryProgress(progress(), episodeSlugs, chapterIds);

  assert.ok(parsed);
  assert.deepEqual(Object.keys(parsed.episodes), ["episode-1"]);
  assert.deepEqual(parsed.seenChapterOpenings, ["chapter-1"]);
  assert.deepEqual(parsed.seenChapterEndings, ["chapter-2"]);
});

test("저장소 접근이 차단되어도 빈 진행도로 계속할 수 있다", () => {
  const unavailable = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  const loaded = loadStoryProgress(
    unavailable,
    ["v3", "v2"],
    episodeSlugs,
    chapterIds,
  );

  assert.equal(loaded.storageAvailable, false);
  assert.deepEqual(loaded.progress.episodes, {});
  assert.deepEqual(readStorageNumber(unavailable, "best"), {
    value: 0,
    storageAvailable: false,
  });
  assert.equal(writeStorageValues(unavailable, [["v3", "{}"]]), false);
});

test("저장 공간 부족 오류를 앱 밖으로 전파하지 않는다", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new DOMException("full", "QuotaExceededError");
    },
  };

  assert.equal(
    writeStorageValues(() => storage, [["v3", progress()]]),
    false,
  );
});
