import { CLOTHING_ITEMS, type ClothingItem } from "./game-data";

export type ScoreBreakdown = {
  tpo: number;
  function: number;
  expression: number;
  completeness: number;
  time: number;
};

export type ScoreResult = {
  total: number;
  stars: number;
  breakdown: ScoreBreakdown;
  missingMandatory: string[];
  strengths: string[];
  improvements: string[];
  selectedNames: string[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function scoreOutfit(
  selectedItemIds: string[],
  elapsedSeconds: number,
): ScoreResult {
  const uniqueIds = [...new Set(selectedItemIds)].slice(0, 4);
  const selected = uniqueIds
    .map((id) => CLOTHING_ITEMS.find((item) => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item));
  const tags = new Set(selected.flatMap((item) => item.tags));
  const selectedBySlot = new Map(selected.map((item) => [item.slot, item]));
  const practicalCount = selected.filter((item) =>
    item.tags.includes("practical"),
  ).length;
  const forbiddenCount = selected.filter((item) =>
    item.tags.includes("forbidden"),
  ).length;

  const rainProtected =
    selected.some(
      (item) =>
        item.slot === "top" &&
        (item.tags.includes("waterproof") ||
          item.tags.includes("water-resistant")),
    ) ||
    selected.some(
      (item) =>
        item.slot === "accessory" && item.tags.includes("waterproof"),
    );
  const visible = tags.has("visible");
  const grip = selected.some(
    (item) => item.slot === "shoes" && item.tags.includes("grip"),
  );
  const active = tags.has("active") || selectedBySlot.has("bottom");
  const coverage = tags.has("coverage");

  const tpo = clamp(
    (rainProtected ? 6 : 0) +
      (visible ? 4 : 0) +
      (grip ? 6 : 0) +
      (active ? 4 : 0) +
      (practicalCount >= 2 ? 6 : practicalCount * 3) +
      (coverage ? 4 : 0),
    0,
    30,
  );

  const functionScore = clamp(
    (rainProtected ? 10 : 0) +
      (grip ? 8 : 0) +
      (visible ? 6 : 0) +
      (coverage ? 6 : 0),
    0,
    30,
  );

  const expression = clamp(
    (practicalCount >= 3 ? 10 : practicalCount * 3) +
      (visible ? 5 : 0) +
      (forbiddenCount === 0 ? 5 : 0),
    0,
    20,
  );

  const completeness = selectedBySlot.size * 2.5;
  const time = clamp(
    Math.round(10 * ((60 - clamp(elapsedSeconds, 0, 60)) / 60)),
    0,
    10,
  );
  const penalty = forbiddenCount * 8;
  let total = Math.round(
    tpo + functionScore + expression + completeness + time - penalty,
  );

  const missingMandatory: string[] = [];
  if (!rainProtected) missingMandatory.push("비를 막아 줄 옷이나 우산");
  if (!visible) missingMandatory.push("어두운 길에서 잘 보이는 밝은색 또는 반사 소품");
  if (!grip) missingMandatory.push("빗길에서 잘 미끄러지지 않는 신발");

  if (missingMandatory.length > 0) total = Math.min(total, 59);
  total = clamp(total, 0, 100);

  const strengths: string[] = [];
  if (rainProtected) strengths.push("비를 막을 준비를 했어요.");
  if (visible) strengths.push("어두운 길에서도 잘 보이는 색이나 소품을 골랐어요.");
  if (grip) strengths.push("빗길에서 안정적으로 걸을 수 있는 신발이에요.");
  if (coverage && practicalCount >= 2)
    strengths.push("몸을 가리면서도 심부름하기 편한 조합이에요.");

  const improvements: string[] = [];
  if (!rainProtected)
    improvements.push("우비나 우산처럼 비를 막는 준비가 필요해요.");
  if (!visible)
    improvements.push("저녁에는 밝은색 옷이나 반사 소품을 더해 주세요.");
  if (!grip)
    improvements.push("밑창이 미끄럽지 않은 운동화나 장화를 골라 보세요.");
  if (forbiddenCount > 0)
    improvements.push("빗길에 불편하거나 위험한 아이템을 다른 옷으로 바꿔 보세요.");
  if (selectedBySlot.size < 4)
    improvements.push("겉옷, 하의, 신발, 소품을 모두 골라 코디를 완성해 보세요.");

  return {
    total,
    stars: total >= 90 ? 3 : total >= 75 ? 2 : total >= 60 ? 1 : 0,
    breakdown: {
      tpo,
      function: functionScore,
      expression,
      completeness,
      time,
    },
    missingMandatory,
    strengths,
    improvements,
    selectedNames: selected.map((item) => item.name),
  };
}
