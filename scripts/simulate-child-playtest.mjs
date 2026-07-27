import { readFile } from "node:fs/promises";

const catalog = JSON.parse(
  await readFile(new URL("../lib/story-catalog.json", import.meta.url), "utf8"),
);

const TRIALS_PER_EPISODE = 240;
const MAX_ATTEMPTS = 3;
const slots = ["top", "bottom", "shoes", "accessory"];
const itemsById = new Map(catalog.items.map((item) => [item.id, item]));

const personas = [
  {
    id: "careful-reader",
    label: "꼼꼼히 읽는 아이",
    age: "10~11세",
    clueAwareness: 0.94,
    mandatoryAwareness: 0.96,
    forbiddenAwareness: 0.92,
    noteReading: 0.92,
    safetyIntuition: 0.82,
    positionBias: 0.04,
    aestheticBias: 0.05,
    noise: 0.1,
    fastTapProbability: 0,
    feedbackAttention: 0.95,
    clueRecall: 0.93,
    elapsedRatio: 0.55,
  },
  {
    id: "typical-reader",
    label: "일반적인 독자",
    age: "8~9세",
    clueAwareness: 0.72,
    mandatoryAwareness: 0.76,
    forbiddenAwareness: 0.68,
    noteReading: 0.7,
    safetyIntuition: 0.64,
    positionBias: 0.16,
    aestheticBias: 0.12,
    noise: 0.28,
    fastTapProbability: 0,
    feedbackAttention: 0.82,
    clueRecall: 0.72,
    elapsedRatio: 0.72,
  },
  {
    id: "early-reader",
    label: "읽기 지원이 필요한 아이",
    age: "6~7세",
    clueAwareness: 0.42,
    mandatoryAwareness: 0.52,
    forbiddenAwareness: 0.42,
    noteReading: 0.34,
    safetyIntuition: 0.54,
    positionBias: 0.24,
    aestheticBias: 0.18,
    noise: 0.44,
    fastTapProbability: 0,
    feedbackAttention: 0.72,
    clueRecall: 0.46,
    elapsedRatio: 0.96,
  },
  {
    id: "picture-first",
    label: "그림부터 고르는 아이",
    age: "7~9세",
    clueAwareness: 0.25,
    mandatoryAwareness: 0.34,
    forbiddenAwareness: 0.25,
    noteReading: 0.16,
    safetyIntuition: 0.38,
    positionBias: 0.4,
    aestheticBias: 0.64,
    noise: 0.5,
    fastTapProbability: 0.08,
    feedbackAttention: 0.64,
    clueRecall: 0.32,
    elapsedRatio: 0.58,
  },
  {
    id: "fast-tapper",
    label: "빠르게 누르는 아이",
    age: "8~10세",
    clueAwareness: 0.14,
    mandatoryAwareness: 0.18,
    forbiddenAwareness: 0.14,
    noteReading: 0.08,
    safetyIntuition: 0.24,
    positionBias: 0.88,
    aestheticBias: 0.2,
    noise: 0.34,
    fastTapProbability: 0.9,
    feedbackAttention: 0.48,
    clueRecall: 0.2,
    elapsedRatio: 0.28,
  },
  {
    id: "feedback-learner",
    label: "피드백으로 배우는 아이",
    age: "8~10세",
    clueAwareness: 0.46,
    mandatoryAwareness: 0.56,
    forbiddenAwareness: 0.48,
    noteReading: 0.44,
    safetyIntuition: 0.58,
    positionBias: 0.14,
    aestheticBias: 0.1,
    noise: 0.38,
    fastTapProbability: 0,
    feedbackAttention: 0.98,
    clueRecall: 0.54,
    elapsedRatio: 0.78,
  },
];

const familiarSafetyTags = new Set([
  "active",
  "closed-shoe",
  "comfortable",
  "coverage",
  "grip",
  "neat",
  "practical",
  "protective",
  "safety",
  "visible",
  "warm",
  "waterproof",
]);

const aestheticTags = new Set([
  "bright",
  "celebration",
  "colorful",
  "cute",
  "decorative",
  "flashy",
  "formal",
  "traditional",
]);

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function orderedItemsForSlot(episode, slot) {
  const items = episode.itemIds
    .map((itemId) => itemsById.get(itemId))
    .filter((item) => item?.slot === slot);
  const slotIndex = slots.indexOf(slot);
  const rotation = (episode.order + slotIndex * 2 + 1) % items.length;
  return [...items.slice(rotation), ...items.slice(0, rotation)];
}

function scoreOutfit(episode, outfit, elapsedSeconds) {
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

  const missingMandatoryRules = episode.rules.mandatory.filter(
    (rule) => !rule.anyTags.some((tag) => tags.has(tag)),
  );
  const matchedForbiddenRules = episode.rules.forbidden.filter((rule) =>
    outfit.some((item) => item.tags.includes(rule.tag)),
  );
  const penalty = episode.rules.forbidden.reduce(
    (sum, rule) =>
      sum +
      rule.penalty *
        outfit.filter((item) => item.tags.includes(rule.tag)).length,
    0,
  );
  const clampedElapsed = Math.max(
    0,
    Math.min(episode.timeLimitSeconds, elapsedSeconds),
  );
  const time = Math.max(
    0,
    Math.min(
      10,
      Math.round(
        10 *
          ((episode.timeLimitSeconds - clampedElapsed) /
            episode.timeLimitSeconds),
      ),
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

  if (missingMandatoryRules.length > 0) total = Math.min(total, 59);

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

  return {
    total: Math.max(0, Math.min(100, total)),
    missingMandatoryRules,
    matchedForbiddenRules,
    unmatchedCriteria: episode.rules.criteria.filter(
      (criterion) => !criterion.anyTags.some((tag) => tags.has(tag)),
    ),
  };
}

function addWeightedTags(target, tags, weight) {
  for (const tag of tags) {
    target.set(tag, (target.get(tag) ?? 0) + weight);
  }
}

function buildKnowledge(profile, episode, attempt, previous, random) {
  const positiveTags = new Map();
  const negativeTags = new Map();
  const retryBoost = attempt * profile.feedbackAttention * 0.16;

  for (const criterion of episode.rules.criteria) {
    if (random() < Math.min(1, profile.clueAwareness + retryBoost)) {
      addWeightedTags(positiveTags, criterion.anyTags, criterion.points);
    }
  }

  for (const rule of episode.rules.mandatory) {
    if (random() < Math.min(1, profile.mandatoryAwareness + retryBoost)) {
      addWeightedTags(positiveTags, rule.anyTags, 16);
    }
  }

  for (const rule of episode.rules.forbidden) {
    if (random() < Math.min(1, profile.forbiddenAwareness + retryBoost)) {
      negativeTags.set(rule.tag, rule.penalty * 1.8);
    }
  }

  if (previous && random() < profile.feedbackAttention) {
    for (const rule of previous.result.missingMandatoryRules) {
      addWeightedTags(positiveTags, rule.anyTags, 24);
    }
    for (const rule of previous.result.matchedForbiddenRules) {
      negativeTags.set(rule.tag, rule.penalty * 3);
    }
    for (const criterion of previous.result.unmatchedCriteria) {
      if (random() < profile.feedbackAttention * 0.72) {
        addWeightedTags(positiveTags, criterion.anyTags, criterion.points * 1.4);
      }
    }
  }

  return { positiveTags, negativeTags };
}

function pickItem(
  profile,
  episode,
  orderedItems,
  knowledge,
  attempt,
  random,
) {
  const fastTapProbability = Math.max(
    0,
    profile.fastTapProbability -
      attempt * profile.feedbackAttention * 0.62,
  );
  if (random() < fastTapProbability) return orderedItems[0];

  const candidates = orderedItems.map((item, index) => {
    let utility = 0;

    for (const tag of item.tags) {
      utility += knowledge.positiveTags.get(tag) ?? 0;
      utility -= knowledge.negativeTags.get(tag) ?? 0;
      if (familiarSafetyTags.has(tag)) {
        utility += profile.safetyIntuition * 4.5;
      }
      if (aestheticTags.has(tag)) {
        utility += profile.aestheticBias * 5;
      }
    }

    if (episode.itemRoles && profile.noteReading > 0) {
      const role = episode.itemRoles[item.id];
      utility +=
        profile.noteReading *
        ({ best: 13, acceptable: 7, partial: 1, mismatch: -8 }[role] ?? 0);
    }

    utility += profile.positionBias * (orderedItems.length - index) * 7;
    utility +=
      (random() - 0.5) *
      22 *
      Math.max(0.08, profile.noise - attempt * 0.08);

    return { item, utility };
  });

  candidates.sort((left, right) => right.utility - left.utility);
  const explorationChance = Math.max(
    0.02,
    profile.noise * 0.32 - attempt * profile.feedbackAttention * 0.08,
  );
  if (random() < explorationChance) {
    return candidates[Math.floor(random() * candidates.length)].item;
  }
  return candidates[0].item;
}

function simulateAttempt(profile, episode, attempt, previous, random) {
  const knowledge = buildKnowledge(
    profile,
    episode,
    attempt,
    previous,
    random,
  );
  const outfit = slots.map((slot) =>
    pickItem(
      profile,
      episode,
      orderedItemsForSlot(episode, slot),
      knowledge,
      attempt,
      random,
    ),
  );
  const elapsedNoise = (random() - 0.5) * 0.24;
  const elapsedSeconds = Math.round(
    Math.max(
      6,
      Math.min(
        episode.timeLimitSeconds,
        episode.timeLimitSeconds *
          Math.max(
            0.12,
            profile.elapsedRatio -
              attempt * profile.feedbackAttention * 0.08 +
              elapsedNoise,
          ),
      ),
    ),
  );
  const result = scoreOutfit(episode, outfit, elapsedSeconds);
  return { outfit, elapsedSeconds, result };
}

function simulateClueRecall(profile, attemptCount, random) {
  const probability = Math.min(
    1,
    profile.clueRecall +
      (attemptCount - 1) * profile.feedbackAttention * 0.12,
  );
  return ["time", "place", "occasion"].filter(() => random() < probability)
    .length;
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

const personaResults = [];
const episodeAccumulator = new Map(
  catalog.episodes.map((episode) => [
    episode.slug,
    {
      order: episode.order,
      title: episode.title,
      trials: 0,
      firstPasses: 0,
      eventualPasses: 0,
      totalFirstScore: 0,
      totalAttempts: 0,
    },
  ]),
);

for (const [personaIndex, profile] of personas.entries()) {
  const summary = {
    id: profile.id,
    label: profile.label,
    age: profile.age,
    trials: 0,
    firstPasses: 0,
    eventualPasses: 0,
    retryOpportunities: 0,
    retryRecoveries: 0,
    totalFirstScore: 0,
    totalFinalScore: 0,
    totalAttempts: 0,
    totalCluesRecalled: 0,
    episodeResults: [],
  };

  for (const episode of catalog.episodes) {
    const episodeSummary = {
      order: episode.order,
      slug: episode.slug,
      title: episode.title,
      trials: 0,
      firstPasses: 0,
      eventualPasses: 0,
      totalFirstScore: 0,
      totalAttempts: 0,
    };

    for (let trial = 0; trial < TRIALS_PER_EPISODE; trial += 1) {
      const seed =
        0x9e3779b9 ^
        ((personaIndex + 1) * 0x85ebca6b) ^
        (episode.order * 0xc2b2ae35) ^
        (trial * 0x27d4eb2f);
      const random = createRandom(seed);
      let previous = null;
      let firstScore = 0;
      let finalScore = 0;
      let passed = false;
      let attemptsUsed = 0;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const current = simulateAttempt(
          profile,
          episode,
          attempt,
          previous,
          random,
        );
        attemptsUsed = attempt + 1;
        if (attempt === 0) firstScore = current.result.total;
        finalScore = current.result.total;
        previous = current;
        if (current.result.total >= 60) {
          passed = true;
          break;
        }
      }

      const firstPassed = firstScore >= 60;
      const cluesRecalled = simulateClueRecall(
        profile,
        attemptsUsed,
        random,
      );

      summary.trials += 1;
      summary.firstPasses += Number(firstPassed);
      summary.eventualPasses += Number(passed);
      summary.retryOpportunities += Number(!firstPassed);
      summary.retryRecoveries += Number(!firstPassed && passed);
      summary.totalFirstScore += firstScore;
      summary.totalFinalScore += finalScore;
      summary.totalAttempts += attemptsUsed;
      summary.totalCluesRecalled += cluesRecalled;

      episodeSummary.trials += 1;
      episodeSummary.firstPasses += Number(firstPassed);
      episodeSummary.eventualPasses += Number(passed);
      episodeSummary.totalFirstScore += firstScore;
      episodeSummary.totalAttempts += attemptsUsed;

      const combinedEpisode = episodeAccumulator.get(episode.slug);
      combinedEpisode.trials += 1;
      combinedEpisode.firstPasses += Number(firstPassed);
      combinedEpisode.eventualPasses += Number(passed);
      combinedEpisode.totalFirstScore += firstScore;
      combinedEpisode.totalAttempts += attemptsUsed;
    }

    summary.episodeResults.push({
      order: episodeSummary.order,
      slug: episodeSummary.slug,
      title: episodeSummary.title,
      firstPassRate: round(
        (episodeSummary.firstPasses / episodeSummary.trials) * 100,
      ),
      eventualPassRate: round(
        (episodeSummary.eventualPasses / episodeSummary.trials) * 100,
      ),
      averageFirstScore: round(
        episodeSummary.totalFirstScore / episodeSummary.trials,
      ),
      averageAttempts: round(
        episodeSummary.totalAttempts / episodeSummary.trials,
        2,
      ),
    });
  }

  personaResults.push({
    id: summary.id,
    label: summary.label,
    age: summary.age,
    trials: summary.trials,
    firstPassRate: round((summary.firstPasses / summary.trials) * 100),
    eventualPassRate: round((summary.eventualPasses / summary.trials) * 100),
    retryRecoveryRate: round(
      summary.retryOpportunities === 0
        ? 100
        : (summary.retryRecoveries / summary.retryOpportunities) * 100,
    ),
    averageFirstScore: round(summary.totalFirstScore / summary.trials),
    averageFinalScore: round(summary.totalFinalScore / summary.trials),
    averageAttempts: round(summary.totalAttempts / summary.trials, 2),
    clueRecallRate: round(
      (summary.totalCluesRecalled / (summary.trials * 3)) * 100,
    ),
    episodes: summary.episodeResults,
  });
}

const episodeResults = [...episodeAccumulator.values()]
  .sort((left, right) => left.order - right.order)
  .map((episode) => ({
    order: episode.order,
    title: episode.title,
    trials: episode.trials,
    firstPassRate: round((episode.firstPasses / episode.trials) * 100),
    eventualPassRate: round((episode.eventualPasses / episode.trials) * 100),
    averageFirstScore: round(episode.totalFirstScore / episode.trials),
    averageAttempts: round(episode.totalAttempts / episode.trials, 2),
  }));

const totalTrials = personaResults.reduce(
  (sum, persona) => sum + persona.trials,
  0,
);
const weighted = (field) =>
  personaResults.reduce(
    (sum, persona) => sum + persona[field] * persona.trials,
    0,
  ) / totalTrials;

const overall = {
  personaCount: personas.length,
  episodeCount: catalog.episodes.length,
  trialsPerEpisode: TRIALS_PER_EPISODE,
  totalJourneys: totalTrials,
  totalAttempts: Math.round(
    personaResults.reduce(
      (sum, persona) =>
        sum + persona.averageAttempts * persona.trials,
      0,
    ),
  ),
  firstPassRate: round(weighted("firstPassRate")),
  eventualPassRate: round(weighted("eventualPassRate")),
  retryRecoveryRate: round(weighted("retryRecoveryRate")),
  averageFirstScore: round(weighted("averageFirstScore")),
  averageFinalScore: round(weighted("averageFinalScore")),
  clueRecallRate: round(weighted("clueRecallRate")),
};

const weakestPersonas = [...personaResults]
  .sort((left, right) => left.eventualPassRate - right.eventualPassRate)
  .slice(0, 2)
  .map((persona) => ({
    id: persona.id,
    label: persona.label,
    eventualPassRate: persona.eventualPassRate,
    clueRecallRate: persona.clueRecallRate,
  }));

const weakestEpisodes = [...episodeResults]
  .sort((left, right) => left.eventualPassRate - right.eventualPassRate)
  .slice(0, 4);

const checks = [
  {
    id: "careful-reader-completes",
    label: "꼼꼼히 읽는 아이의 최종 성공률 95% 이상",
    pass:
      personaResults.find((persona) => persona.id === "careful-reader")
        .eventualPassRate >= 95,
  },
  {
    id: "typical-reader-recovers",
    label: "일반적인 독자의 최종 성공률 85% 이상",
    pass:
      personaResults.find((persona) => persona.id === "typical-reader")
        .eventualPassRate >= 85,
  },
  {
    id: "feedback-has-effect",
    label: "전체 최종 성공률이 첫 성공률보다 15%p 이상 상승",
    pass: overall.eventualPassRate - overall.firstPassRate >= 15,
  },
  {
    id: "learning-contrast-remains",
    label: "빠르게 누르는 아이의 첫 성공률이 50% 미만",
    pass:
      personaResults.find((persona) => persona.id === "fast-tapper")
        .firstPassRate < 50,
  },
  {
    id: "no-episode-dead-end",
    label: "모든 에피소드의 전체 최종 성공률 55% 이상",
    pass: episodeResults.every((episode) => episode.eventualPassRate >= 55),
  },
];

const report = {
  generatedAt: new Date().toISOString(),
  methodology: {
    deterministic: true,
    maxAttempts: MAX_ATTEMPTS,
    note:
      "규칙 인지, 카드 위치 편향, 그림 선호, 안전 직관, 피드백 학습률을 유형별로 달리한 결정론적 대리 사용자 시뮬레이션입니다.",
  },
  overall,
  personas: personaResults,
  episodes: episodeResults,
  weakestPersonas,
  weakestEpisodes,
  checks,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    [
      `어린이 대리 플레이: ${overall.totalJourneys.toLocaleString("ko-KR")}회 여정 / ${overall.totalAttempts.toLocaleString("ko-KR")}회 시도`,
      `첫 성공률 ${overall.firstPassRate}% → 최대 ${MAX_ATTEMPTS}회 시도 후 ${overall.eventualPassRate}%`,
      `재도전 회복률 ${overall.retryRecoveryRate}% · 평균 점수 ${overall.averageFirstScore}점 → ${overall.averageFinalScore}점`,
      `T·P·O 단서 회상률 ${overall.clueRecallRate}%`,
      ...checks.map(
        (check) => `${check.pass ? "통과" : "실패"} · ${check.label}`,
      ),
    ].join("\n"),
  );
}

if (checks.some((check) => !check.pass)) {
  process.exitCode = 1;
}
