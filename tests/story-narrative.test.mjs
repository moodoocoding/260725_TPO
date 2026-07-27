import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const catalog = JSON.parse(
  await readFile(new URL("../lib/story-catalog.json", import.meta.url), "utf8"),
);
const source = await readFile(
  new URL("../lib/story-narrative.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});

assert.deepEqual(
  transpiled.diagnostics?.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  ),
  [],
);

const narrative = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);

test("카탈로그의 다섯 챕터와 13개 에피소드 내러티브가 빠짐없이 연결된다", () => {
  assert.equal(
    narrative.STORY_NARRATIVE_TITLE,
    "하루와 친구들, 네 개의 구조대 배지",
  );
  assert.deepEqual(
    narrative.STORY_NARRATIVE_CHAPTER_IDS,
    catalog.chapters.map((chapter) => chapter.id),
  );
  assert.deepEqual(
    narrative.STORY_NARRATIVE_EPISODE_SLUGS,
    catalog.episodes.map((episode) => episode.slug),
  );
  assert.equal(
    Object.keys(narrative.STORY_EPISODE_NARRATIVES).length,
    13,
  );

  for (const chapter of catalog.chapters) {
    const entry = narrative.getChapterNarrative(chapter.id);
    assert.ok(entry, chapter.id);
    assert.equal(entry.chapterId, chapter.id);
    assert.equal(entry.opening.length, 3, `${chapter.id}: opening`);
    assert.ok(entry.badgeName, `${chapter.id}: badgeName`);
    assert.ok(entry.ending.length >= 2, `${chapter.id}: ending`);
    assert.ok(entry.nextHook.length >= 1, `${chapter.id}: nextHook`);
  }
});

test("모든 에피소드에 도입·성공 후일담·재도전·다음 훅이 있고 요청자가 일치한다", () => {
  for (const episode of catalog.episodes) {
    const entry = narrative.getEpisodeNarrative(episode.slug);
    assert.ok(entry, episode.slug);
    assert.equal(entry.slug, episode.slug);
    assert.equal(entry.chapterId, episode.chapterId);
    assert.equal(entry.order, episode.order);
    assert.equal(entry.requester, episode.sender);
    assert.ok(entry.cause.length > 20, `${episode.slug}: cause`);
    assert.ok(
      entry.intro.length >= 2 && entry.intro.length <= 4,
      `${episode.slug}: intro`,
    );
    assert.ok(
      entry.successAftermath.length >= 1 &&
        entry.successAftermath.length <= 2,
      `${episode.slug}: successAftermath`,
    );
    assert.match(entry.retryLine, /아직/);
    assert.ok(entry.nextHook.length >= 1, `${episode.slug}: nextHook`);
  }
});

test("하루는 1·5화 착용자이자 다른 요청자를 돕는 현장 파트너로 이어진다", () => {
  const wearerBySlug = Object.fromEntries(
    catalog.episodes.map((episode) => [
      episode.slug,
      episode.slug === "rescue-team-trial" ? "하루" : episode.sender,
    ]),
  );

  for (const episode of catalog.episodes) {
    const entry = narrative.getEpisodeNarrative(episode.slug);
    const visibleStory = [
      ...entry.intro.map((beat) => beat.text),
      ...entry.successAftermath.map((beat) => beat.text),
      entry.retryLine,
    ].join(" ");

    assert.match(
      visibleStory,
      new RegExp(wearerBySlug[episode.slug]),
      `${episode.slug}: 화면의 착용자`,
    );
    assert.match(
      entry.retryLine,
      new RegExp(`^${wearerBySlug[episode.slug]}`),
      `${episode.slug}: 재도전 주체`,
    );
  }

  assert.match(
    narrative.STORY_EPISODE_NARRATIVES["rescue-team-trial"].cause,
    /하루가 신입 코디네이터가 고른 옷을 입고/,
  );
});

test("1~12화의 다음 훅은 다음 요청자를 이름으로 예고한다", () => {
  const orderedEpisodes = [...catalog.episodes].sort(
    (left, right) => left.order - right.order,
  );

  for (let index = 0; index < orderedEpisodes.length - 1; index += 1) {
    const current = orderedEpisodes[index];
    const next = orderedEpisodes[index + 1];
    const nextWearer =
      next.slug === "rescue-team-trial" ? "하루" : next.sender;
    const hookText = narrative.STORY_EPISODE_NARRATIVES[
      current.slug
    ].nextHook
      .map((beat) => beat.text)
      .join(" ");

    assert.match(
      hookText,
      new RegExp(nextWearer),
      `${current.slug} → ${next.slug}`,
    );
  }
});

test("비트 ID가 유일하고 표시용 문장과 최종 엔딩이 완전하다", () => {
  const allBeats = [
    ...Object.values(narrative.STORY_CHAPTER_NARRATIVES).flatMap((chapter) => [
      ...chapter.opening,
      ...chapter.ending,
      ...chapter.nextHook,
    ]),
    ...Object.values(narrative.STORY_EPISODE_NARRATIVES).flatMap((episode) => [
      ...episode.intro,
      ...episode.successAftermath,
      ...episode.nextHook,
    ]),
    ...narrative.STORY_FINAL_ENDING.ending,
    ...narrative.STORY_FINAL_ENDING.nextSeasonHook,
  ];

  assert.equal(new Set(allBeats.map((beat) => beat.id)).size, allBeats.length);
  assert.ok(allBeats.every((beat) => beat.text.trim().length > 0));
  assert.ok(allBeats.every((beat) => beat.speaker.trim().length > 0));
  assert.ok(allBeats.every((beat) => beat.visualKey.trim().length > 0));
  assert.ok(allBeats.every((beat) => beat.mood.trim().length > 0));
  assert.ok(
    allBeats.every((beat) => beat.text.length <= 60),
    "저학년용 화면 문장은 60자를 넘지 않는다",
  );
  assert.ok(
    allBeats.every((beat) => /[\uAC00-\uD7A3]/.test(beat.text)),
  );
  assert.equal(narrative.STORY_FINAL_ENDING.title, "정식 TPO 구조대원");
  assert.ok(narrative.STORY_FINAL_ENDING.ending.length >= 4);
  assert.ok(narrative.STORY_FINAL_ENDING.nextSeasonHook.length >= 1);
  assert.match(
    narrative.STORY_FINAL_ENDING.nextSeasonHook.at(-1).text,
    /새로운 계절/,
  );
});

test("안전·예절 장면의 이야기 원칙이 지켜진다", () => {
  const funeral =
    narrative.STORY_EPISODE_NARRATIVES["family-funeral"];
  assert.ok(
    [...funeral.intro, ...funeral.successAftermath].every(
      (beat) => beat.mood === "solemn" || beat.mood === "calm",
    ),
  );
  assert.doesNotMatch(
    [...funeral.intro, ...funeral.successAftermath]
      .map((beat) => beat.text)
      .join(" "),
    /폭죽|신나|검은색.*반드시/,
  );

  const zombie =
    narrative.STORY_EPISODE_NARRATIVES["zombie-city-escape"];
  const zombieText = [
    zombie.cause,
    ...zombie.intro.map((beat) => beat.text),
  ].join(" ");
  assert.match(zombieText, /가상훈련|가상 도시/);
  assert.match(zombieText, /싸우는 것이 아니라/);
});
