import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const catalog = JSON.parse(
  await readFile(new URL("../lib/story-catalog.json", import.meta.url), "utf8"),
);
const source = await readFile(
  new URL("../lib/tpo-learning.ts", import.meta.url),
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

const learningModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);
const episodeSlugs = catalog.episodes.map((episode) => episode.slug);
const learningEntries = episodeSlugs.map((slug) => [
  slug,
  learningModule.getEpisodeLearning(slug),
]);

const hasKorean = (value) => /[\uAC00-\uD7A3]/.test(value);
const textLength = (value) => Array.from(value).length;

test("카탈로그의 13개 에피소드에 학습 데이터가 빠짐없이 연결된다", () => {
  assert.equal(catalog.episodes.length, 13);
  assert.equal(learningEntries.length, 13);

  for (const [slug, learning] of learningEntries) {
    assert.ok(learning, `${slug}: learning data`);
    assert.ok(learning.reasonPrompt, `${slug}: reasonPrompt`);
    assert.equal(learning.reasonClues.length, 3, `${slug}: reasonClues`);
    assert.ok(learning.modelAnswer, `${slug}: modelAnswer`);
    assert.ok(learning.transfer.situation, `${slug}: situation`);
    assert.ok(learning.transfer.question, `${slug}: question`);
    assert.equal(learning.transfer.options.length, 3, `${slug}: options`);
    assert.ok(learning.transfer.correctOptionId, `${slug}: correctOptionId`);
    assert.ok(learning.transfer.successFeedback, `${slug}: successFeedback`);
    assert.ok(learning.transfer.retryFeedback, `${slug}: retryFeedback`);
  }

  assert.equal(learningModule.getEpisodeLearning("없는-에피소드"), undefined);
});

test("모든 전이 문제는 중복 없는 세 보기와 실제 정답을 가진다", () => {
  const allOptionIds = [];

  for (const [slug, learning] of learningEntries) {
    const optionIds = learning.transfer.options.map((option) => option.id);
    const optionLabels = learning.transfer.options.map((option) => option.label);

    assert.equal(new Set(optionIds).size, 3, `${slug}: duplicate option id`);
    assert.equal(
      new Set(optionLabels).size,
      3,
      `${slug}: duplicate option label`,
    );
    assert.ok(
      optionIds.includes(learning.transfer.correctOptionId),
      `${slug}: missing correct option`,
    );
    allOptionIds.push(...optionIds);
  }

  assert.equal(
    new Set(allOptionIds).size,
    allOptionIds.length,
    "option ids must be globally unique",
  );

  const correctPositions = learningEntries.map(([, learning]) =>
    learning.transfer.options.findIndex(
      (option) => option.id === learning.transfer.correctOptionId,
    ),
  );
  assert.deepEqual(new Set(correctPositions), new Set([0, 1, 2]));
});

test("사용자에게 보이는 문장은 한국어이며 초등학생이 읽을 길이로 제한된다", () => {
  const limits = {
    reasonPrompt: 55,
    reasonClue: 36,
    modelAnswer: 145,
    situation: 55,
    question: 70,
    option: 80,
    feedback: 120,
  };

  for (const [slug, learning] of learningEntries) {
    const fields = [
      ["reasonPrompt", learning.reasonPrompt, limits.reasonPrompt],
      ["modelAnswer", learning.modelAnswer, limits.modelAnswer],
      ["situation", learning.transfer.situation, limits.situation],
      ["question", learning.transfer.question, limits.question],
      [
        "successFeedback",
        learning.transfer.successFeedback,
        limits.feedback,
      ],
      ["retryFeedback", learning.transfer.retryFeedback, limits.feedback],
      ...learning.reasonClues.map((clue, index) => [
        `reasonClue-${index + 1}`,
        clue,
        limits.reasonClue,
      ]),
      ...learning.transfer.options.map((option, index) => [
        `option-${index + 1}`,
        option.label,
        limits.option,
      ]),
    ];

    for (const [field, value, limit] of fields) {
      assert.ok(hasKorean(value), `${slug}: ${field} is not Korean`);
      assert.equal(value.includes("\uFFFD"), false, `${slug}: ${field}`);
      assert.ok(
        textLength(value) <= limit,
        `${slug}: ${field} is ${textLength(value)} characters`,
      );
    }
  }
});

test("챕터별 질문이 활동에서 환경·마음·안전 전이로 성장한다", () => {
  const chapterText = (chapterId) =>
    catalog.episodes
      .filter((episode) => episode.chapterId === chapterId)
      .map((episode) => {
        const learning = learningModule.getEpisodeLearning(episode.slug);
        return [
          learning.reasonPrompt,
          ...learning.reasonClues,
          learning.modelAnswer,
          learning.transfer.question,
          ...learning.transfer.options.map((option) => option.label),
        ].join(" ");
      })
      .join(" ");

  assert.match(chapterText("busy-day"), /활동|움직|쉬|놀/);
  assert.match(chapterText("weather-alert"), /환경|햇빛|영하|비|눈/);
  assert.match(chapterText("heart-and-manners"), /마음|존중|역할|전통/);
  assert.match(chapterText("safety-call"), /위험|보호|원칙|적용|연결/);

  for (const slug of [
    "science-lab-experiment",
    "family-cooking",
    "zombie-city-escape",
  ]) {
    const learning = learningModule.getEpisodeLearning(slug);
    const safetyReasoning = [
      learning.reasonPrompt,
      learning.modelAnswer,
      learning.transfer.question,
      learning.transfer.successFeedback,
    ].join(" ");
    assert.match(safetyReasoning, /위험|보호|원칙|적용|연결/, slug);
  }
});

test("장례식 문화적 주의와 좀비 가상훈련 표현을 지킨다", () => {
  const funeral = learningModule.getEpisodeLearning("family-funeral");
  const funeralCorrect = funeral.transfer.options.find(
    (option) => option.id === funeral.transfer.correctOptionId,
  );
  const funeralGuidance = [
    funeral.modelAnswer,
    funeralCorrect.label,
    funeral.transfer.successFeedback,
    funeral.transfer.retryFeedback,
  ].join(" ");
  assert.match(funeralGuidance, /가족|주최자|공간/);
  assert.match(funeralGuidance, /문화|안내/);
  assert.doesNotMatch(funeralGuidance, /검은색.*반드시|검은 옷만 정답/);

  const zombie = learningModule.getEpisodeLearning("zombie-city-escape");
  const zombieText = [
    zombie.reasonPrompt,
    zombie.modelAnswer,
    zombie.transfer.situation,
    zombie.transfer.successFeedback,
    ...zombie.transfer.options.map((option) => option.label),
  ].join(" ");
  assert.match(zombieText, /가상훈련|가상 좀비 훈련/);
  assert.doesNotMatch(zombieText, /실제 재난|실제 좀비/);
});

test("최종화는 T·P·O와 네 안전 기능을 스스로 연결하는 종합 문제다", () => {
  const finalLearning = learningModule.getEpisodeLearning(
    "zombie-city-escape",
  );
  const correct = finalLearning.transfer.options.find(
    (option) => option.id === finalLearning.transfer.correctOptionId,
  );

  assert.match(finalLearning.reasonPrompt, /T·P·O/);
  assert.match(finalLearning.transfer.question, /힌트 없이/);
  assert.match(finalLearning.transfer.question, /분석/);
  for (const keyword of ["가시성", "보호", "접지", "활동성"]) {
    assert.match(finalLearning.modelAnswer, new RegExp(keyword));
    assert.match(correct.label, new RegExp(keyword));
  }
  assert.ok(
    finalLearning.transfer.options
      .filter((option) => option.id !== finalLearning.transfer.correctOptionId)
      .every((option) => textLength(option.label) >= 25),
  );
});
