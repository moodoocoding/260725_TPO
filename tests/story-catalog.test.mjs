import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(
  await readFile(new URL("../lib/story-catalog.json", import.meta.url), "utf8"),
);
const itemById = new Map(catalog.items.map((item) => [item.id, item]));
const slotNames = ["top", "bottom", "shoes", "accessory"];

function combinationsForEpisode(episode) {
  const bySlot = Object.fromEntries(slotNames.map((slot) => [slot, []]));
  for (const itemId of episode.itemIds) {
    bySlot[itemById.get(itemId).slot].push(itemById.get(itemId));
  }

  const combinations = [];
  for (const top of bySlot.top) {
    for (const bottom of bySlot.bottom) {
      for (const shoes of bySlot.shoes) {
        for (const accessory of bySlot.accessory) {
          combinations.push([top, bottom, shoes, accessory]);
        }
      }
    }
  }
  return combinations;
}

function satisfiesMandatory(episode, outfit) {
  const tags = new Set(outfit.flatMap((item) => item.tags));
  return episode.rules.mandatory.every((rule) =>
    rule.anyTags.some((tag) => tags.has(tag)),
  );
}

function scoreCombination(episode, outfit, elapsedSeconds = 0) {
  const tags = new Set(outfit.flatMap((item) => item.tags));
  const categoryCaps = { tpo: 30, function: 30, expression: 20 };
  const categoryScores = { tpo: 0, function: 0, expression: 0 };

  for (const criterion of episode.rules.criteria) {
    if (criterion.anyTags.some((tag) => tags.has(tag))) {
      categoryScores[criterion.category] += criterion.points;
    }
  }

  for (const category of Object.keys(categoryCaps)) {
    categoryScores[category] = Math.max(
      0,
      Math.min(categoryCaps[category], categoryScores[category]),
    );
  }

  const missingMandatory = episode.rules.mandatory.some(
    (rule) => !rule.anyTags.some((tag) => tags.has(tag)),
  );
  const penalty = episode.rules.forbidden.reduce(
    (sum, rule) =>
      sum +
      rule.penalty *
        outfit.filter((item) => item.tags.includes(rule.tag)).length,
    0,
  );
  const timeLimit = Math.max(1, episode.timeLimitSeconds);
  const clampedElapsed = Math.max(0, Math.min(timeLimit, elapsedSeconds));
  const time = Math.max(
    0,
    Math.min(
      10,
      Math.round(10 * ((timeLimit - clampedElapsed) / timeLimit)),
    ),
  );
  let total = Math.round(
    categoryScores.tpo +
      categoryScores.function +
      categoryScores.expression +
      outfit.length * 2.5 +
      time -
      penalty,
  );

  if (missingMandatory) total = Math.min(total, 59);
  if (episode.itemRoles) {
    const selectedRoles = outfit.map(
      (item) => episode.itemRoles[item.id] ?? "mismatch",
    );
    if (selectedRoles.includes("mismatch")) {
      total = Math.min(total, 45);
    } else if (selectedRoles.includes("partial")) {
      total = Math.min(total, 59);
    } else if (episode.canonicalItemIds) {
      const selectedIds = new Set(outfit.map((item) => item.id));
      const isCanonical =
        selectedIds.size === episode.canonicalItemIds.length &&
        episode.canonicalItemIds.every((itemId) => selectedIds.has(itemId));
      if (!isCanonical) total = Math.min(total, 94);
    }
  }
  return Math.max(0, Math.min(100, total));
}

test("프롤로그와 네 챕터에 총 13개 에피소드가 순서대로 있다", () => {
  assert.equal(catalog.chapters.length, 5);
  assert.equal(catalog.episodes.length, 13);
  assert.deepEqual(catalog.slots, slotNames);
  assert.equal(
    new Set(catalog.chapters.map((chapter) => chapter.id)).size,
    catalog.chapters.length,
  );
  assert.deepEqual(
    catalog.episodes.map((episode) => episode.order),
    Array.from({ length: 13 }, (_, index) => index + 1),
  );

  const episodeSlugs = new Set(catalog.episodes.map((episode) => episode.slug));
  const chapterSlugs = catalog.chapters.flatMap(
    (chapter) => chapter.episodeSlugs,
  );
  assert.equal(new Set(chapterSlugs).size, 13);
  assert.ok(chapterSlugs.every((slug) => episodeSlugs.has(slug)));
  assert.deepEqual(
    chapterSlugs,
    catalog.episodes.map((episode) => episode.slug),
  );

  const chapterByEpisode = new Map(
    catalog.chapters.flatMap((chapter) =>
      chapter.episodeSlugs.map((slug) => [slug, chapter.id]),
    ),
  );
  for (const episode of catalog.episodes) {
    assert.equal(
      chapterByEpisode.get(episode.slug),
      episode.chapterId,
      episode.slug,
    );
  }
});

test("아이템 ID와 에피소드 콘텐츠가 완전하다", () => {
  assert.equal(itemById.size, catalog.items.length);
  assert.ok(catalog.items.length >= 60);
  const usedItemIds = new Set(
    catalog.episodes.flatMap((episode) => episode.itemIds),
  );
  assert.equal(usedItemIds.size, catalog.items.length);

  for (const item of catalog.items) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(slotNames.includes(item.slot), item.id);
    assert.match(item.color, /^#[0-9a-f]{6}$/i);
    assert.match(item.accent, /^#[0-9a-f]{6}$/i);
    assert.ok(/[\uAC00-\uD7A3]/.test(item.name), item.id);
    assert.ok(/[\uAC00-\uD7A3]/.test(item.note), item.id);
    assert.ok(item.tags.length > 0, item.id);
    assert.equal(new Set(item.tags).size, item.tags.length, item.id);
    assert.ok(item.layerKinds.length > 0, item.id);
    assert.equal(
      new Set(item.layerKinds).size,
      item.layerKinds.length,
      item.id,
    );
    assert.ok(
      item.layerKinds.every((kind) =>
        ["back", "main", "front"].includes(kind),
      ),
      item.id,
    );
  }

  for (const episode of catalog.episodes) {
    assert.match(episode.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const expectedItemsPerSlot = 4;
    const expectedItemCount = expectedItemsPerSlot * slotNames.length;
    assert.equal(episode.itemIds.length, expectedItemCount, episode.slug);
    assert.equal(
      new Set(episode.itemIds).size,
      expectedItemCount,
      episode.slug,
    );
    assert.equal(episode.messages.length, 4, episode.slug);
    assert.equal(episode.backgroundColors.length, 2, episode.slug);
    assert.ok(
      episode.backgroundColors.every((color) =>
        /^#[0-9a-f]{6}$/i.test(color),
      ),
      episode.slug,
    );
    assert.ok(
      Number.isInteger(episode.timeLimitSeconds) &&
        episode.timeLimitSeconds > 0,
      episode.slug,
    );
    assert.ok(episode.tpo.time && episode.tpo.place && episode.tpo.occasion);

    const counts = Object.fromEntries(slotNames.map((slot) => [slot, 0]));
    for (const itemId of episode.itemIds) {
      assert.ok(itemById.has(itemId), `${episode.slug}: ${itemId}`);
      counts[itemById.get(itemId).slot] += 1;
    }
    assert.deepEqual(
      counts,
      Object.fromEntries(
        slotNames.map((slot) => [slot, expectedItemsPerSlot]),
      ),
    );
  }
});

test("모든 에피소드의 배점은 30·30·20이고 안전 필수 규칙이 있다", () => {
  for (const episode of catalog.episodes) {
    const totals = { tpo: 0, function: 0, expression: 0 };
    const episodeTags = new Set(
      episode.itemIds.flatMap((itemId) => itemById.get(itemId).tags),
    );

    for (const criterion of episode.rules.criteria) {
      totals[criterion.category] += criterion.points;
      assert.ok(criterion.anyTags.length > 0);
      assert.ok(Number.isInteger(criterion.points) && criterion.points > 0);
      assert.ok(
        criterion.anyTags.some((tag) => episodeTags.has(tag)),
        `${episode.slug}: unreachable criterion ${criterion.anyTags.join("|")}`,
      );
    }
    assert.deepEqual(
      totals,
      { tpo: 30, function: 30, expression: 20 },
      episode.slug,
    );
    assert.ok(episode.rules.mandatory.length >= 2, episode.slug);
    assert.ok(episode.rules.forbidden.length >= 2, episode.slug);
    assert.equal(
      new Set(episode.rules.mandatory.map((rule) => rule.label)).size,
      episode.rules.mandatory.length,
      episode.slug,
    );
    assert.equal(
      new Set(episode.rules.forbidden.map((rule) => rule.tag)).size,
      episode.rules.forbidden.length,
      episode.slug,
    );

    for (const rule of episode.rules.mandatory) {
      assert.ok(rule.anyTags.length > 0, episode.slug);
      assert.ok(
        rule.anyTags.some((tag) => episodeTags.has(tag)),
        `${episode.slug}: unreachable mandatory ${rule.label}`,
      );
    }
    for (const rule of episode.rules.forbidden) {
      assert.ok(episodeTags.has(rule.tag), `${episode.slug}: ${rule.tag}`);
      assert.ok(Number.isInteger(rule.penalty) && rule.penalty > 0);
    }
  }
});

test("각 에피소드는 충분한 조합과 안전 조건을 충족하는 조합을 가진다", () => {
  for (const episode of catalog.episodes) {
    const combinations = combinationsForEpisode(episode);
    const expectedCombinations = 256;
    assert.equal(combinations.length, expectedCombinations, episode.slug);
    assert.ok(
      combinations.some((outfit) => satisfiesMandatory(episode, outfit)),
      `${episode.slug} has no safe outfit`,
    );
    assert.ok(
      combinations.some((outfit) => !satisfiesMandatory(episode, outfit)),
      `${episode.slug} has no learning contrast`,
    );
  }
});

test("모든 조합을 채점하면 각 에피소드에 100점·통과·실패가 모두 존재한다", () => {
  for (const episode of catalog.episodes) {
    const scores = combinationsForEpisode(episode).map((outfit) =>
      scoreCombination(episode, outfit),
    );

    assert.equal(Math.max(...scores), 100, `${episode.slug}: max score`);
    assert.ok(
      scores.some((score) => score >= 60),
      `${episode.slug}: no passing outfit`,
    );
    assert.ok(
      scores.some((score) => score < 60),
      `${episode.slug}: no failing outfit`,
    );
  }
});

test("1화는 하나의 대표 만점 조합과 8~24개의 안전한 통과 조합을 가진다", () => {
  const episode = catalog.episodes.find(
    (entry) => entry.slug === "rescue-team-trial",
  );
  assert.ok(episode);
  assert.equal(Object.keys(episode.itemRoles ?? {}).length, 16);
  assert.equal(episode.canonicalItemIds?.length, 4);

  const scores = combinationsForEpisode(episode).map((outfit) =>
    scoreCombination(episode, outfit),
  );
  const passingCount = scores.filter((score) => score >= 60).length;
  assert.ok(passingCount >= 8 && passingCount <= 24, passingCount);
  assert.equal(scores.filter((score) => score === 100).length, 1);
});

test("카탈로그 텍스트에 깨진 문자나 데이터베이스 의존성이 없다", () => {
  const serialized = JSON.stringify(catalog);
  assert.equal(serialized.includes("\uFFFD"), false);
  assert.equal(/(?:Ã.|Â.|ì[\u0080-\u00BF]|ë[\u0080-\u00BF])/.test(serialized), false);
  assert.equal(/supabase/i.test(serialized), false);
  assert.equal(serialized.includes("준비 준비"), false);

  const userFacingStrings = [
    ...catalog.items.flatMap((item) => [item.name, item.note]),
    ...catalog.episodes.flatMap((episode) => [
      episode.title,
      episode.kicker,
      episode.teaser,
      episode.sender,
      episode.weatherLabel,
      episode.weatherNote,
      episode.tpo.time,
      episode.tpo.place,
      episode.tpo.occasion,
      episode.successTitle,
      episode.retryTitle,
      ...episode.messages.flatMap((message) => [
        message.speaker,
        message.text,
      ]),
      ...episode.rules.criteria.flatMap((criterion) => [
        criterion.strength,
        criterion.improvement,
      ]),
      ...episode.rules.mandatory.flatMap((rule) => [
        rule.label,
        rule.improvement,
      ]),
      ...episode.rules.forbidden.map((rule) => rule.feedback),
    ]),
  ];
  assert.ok(
    userFacingStrings.every((value) => /[\uAC00-\uD7A3]/.test(value)),
  );
});
