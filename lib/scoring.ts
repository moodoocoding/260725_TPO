import {
  getItemsForEpisode,
  type ClothingItem,
  type ScoreCategory,
  type StoryEpisode,
} from "@/lib/story-data";

export type ScoreBreakdown = {
  tpo: number;
  function: number;
  expression: number;
  completeness: number;
  time: number;
};

export type ScoreResult = {
  scenarioSlug: string;
  total: number;
  stars: number;
  breakdown: ScoreBreakdown;
  missingMandatory: string[];
  strengths: string[];
  improvements: string[];
  selectedNames: string[];
};

const CATEGORY_CAPS: Record<ScoreCategory, number> = {
  tpo: 30,
  function: 30,
  expression: 20,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const unique = (messages: string[]) => [...new Set(messages)];

function selectValidItems(
  episode: StoryEpisode,
  selectedItemIds: readonly string[],
): ClothingItem[] {
  const availableItems = new Map(
    getItemsForEpisode(episode).map((item) => [item.id, item]),
  );
  const bySlot = new Map<ClothingItem["slot"], ClothingItem>();

  for (const itemId of [...new Set(selectedItemIds)]) {
    const item = availableItems.get(itemId);
    if (item && !bySlot.has(item.slot)) bySlot.set(item.slot, item);
  }

  return [...bySlot.values()];
}

export function scoreOutfit(
  episode: StoryEpisode,
  selectedItemIds: readonly string[],
  elapsedSeconds: number,
): ScoreResult {
  const selected = selectValidItems(episode, selectedItemIds);
  const tags = new Set(selected.flatMap((item) => item.tags));
  const categoryScores: Record<ScoreCategory, number> = {
    tpo: 0,
    function: 0,
    expression: 0,
  };
  const strengths: string[] = [];
  const improvements: string[] = [];

  for (const criterion of episode.rules.criteria) {
    const matched = criterion.anyTags.some((tag) => tags.has(tag));
    if (matched) {
      categoryScores[criterion.category] += criterion.points;
      strengths.push(criterion.strength);
    } else {
      improvements.push(criterion.improvement);
    }
  }

  for (const category of Object.keys(CATEGORY_CAPS) as ScoreCategory[]) {
    categoryScores[category] = clamp(
      categoryScores[category],
      0,
      CATEGORY_CAPS[category],
    );
  }

  const missingMandatory = episode.rules.mandatory
    .filter((rule) => !rule.anyTags.some((tag) => tags.has(tag)))
    .map((rule) => rule.label);

  for (const rule of episode.rules.mandatory) {
    if (missingMandatory.includes(rule.label)) {
      improvements.push(rule.improvement);
    }
  }

  let penalty = 0;
  for (const rule of episode.rules.forbidden) {
    const matchedCount = selected.filter((item) =>
      item.tags.includes(rule.tag),
    ).length;
    if (matchedCount > 0) {
      penalty += rule.penalty * matchedCount;
      improvements.push(rule.feedback);
    }
  }

  const completeness = selected.length * 2.5;
  const timeLimit = Math.max(1, episode.timeLimitSeconds);
  const time = clamp(
    Math.round(
      10 *
        ((timeLimit - clamp(elapsedSeconds, 0, timeLimit)) / timeLimit),
    ),
    0,
    10,
  );
  let total = Math.round(
    categoryScores.tpo +
      categoryScores.function +
      categoryScores.expression +
      completeness +
      time -
      penalty,
  );

  if (selected.length < 4) {
    improvements.push("겉옷, 하의, 신발, 소품을 모두 골라 코디를 완성해 보세요.");
  }
  if (missingMandatory.length > 0) total = Math.min(total, 59);
  total = clamp(total, 0, 100);

  return {
    scenarioSlug: episode.slug,
    total,
    stars: total >= 90 ? 3 : total >= 75 ? 2 : total >= 60 ? 1 : 0,
    breakdown: {
      tpo: categoryScores.tpo,
      function: categoryScores.function,
      expression: categoryScores.expression,
      completeness,
      time,
    },
    missingMandatory,
    strengths: unique(strengths),
    improvements: unique(improvements),
    selectedNames: selected.map((item) => item.name),
  };
}
