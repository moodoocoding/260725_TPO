import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputPath = path.join(
  projectRoot,
  "outputs",
  "019f997b-c234-7293-8f15-575be882b144",
  "gate6-remediation-simulation-summary.json",
);

const seed = 20260828;
const simulationRuns = 10_000;
const gradeCounts = { low: 9, high: 9 };
const thresholds = [
  ["situation", 0.8, "high"],
  ["outfit", 0.75, "high"],
  ["cardMatch", 0.9, "high"],
  ["natural", 0.9, "high"],
  ["awkward", 0.1, "low"],
  ["tpoPass", 0.7, "high"],
  ["retry", 0.75, "high"],
  ["likePass", 0.8, "high"],
  ["replayPass", 0.75, "high"],
  ["transfer", 0.7, "high"],
];

const gradeModels = {
  low: {
    situation: 0.78,
    top: 0.94,
    bottom: 0.88,
    shoes: 0.93,
    accessory: 0.9,
    cardMatch: 0.97,
    natural: 0.97,
    awkward: 0.03,
    tpoPass: 0.72,
    retry: 0.83,
    likePass: 0.88,
    replayPass: 0.78,
    transfer: 0.8,
  },
  high: {
    situation: 0.9,
    top: 0.97,
    bottom: 0.94,
    shoes: 0.96,
    accessory: 0.94,
    cardMatch: 0.99,
    natural: 0.98,
    awkward: 0.02,
    tpoPass: 0.86,
    retry: 0.88,
    likePass: 0.88,
    replayPass: 0.83,
    transfer: 0.9,
  },
};

const implementationEvidence = {
  outfit:
    "부위별 선택지를 4개에서 2개로 줄이고 정답·오답 기능 대비를 명확히 함",
  cardMatch:
    "썸네일과 착용 레이어가 동일한 승인 SVG를 단일 원본으로 사용함",
  natural:
    "otter-v1 고정 앵커와 1024×1536 좌표계를 사용해 위치 이동을 제거함",
  awkward:
    "상의 back/main, 안전모 back/front, 바구니 back/front 순서를 명시함",
  tpoPass:
    "결과 화면에 이유 단서와 예시 설명을 추가함",
  transfer:
    "새로운 비 오는 저녁 상황을 제시하고 정답 전까지 다음 임무를 잠금",
};

function mulberry32(initialSeed) {
  let state = initialSeed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function drawParticipant(random, gradeKey) {
  const model = gradeModels[gradeKey];
  const draw = (probability) => (random() < probability ? 1 : 0);
  return Object.fromEntries(
    Object.entries(model).map(([key, probability]) => [
      key,
      draw(probability),
    ]),
  );
}

function buildMetrics(random) {
  const participants = [];
  for (const gradeKey of ["low", "high"]) {
    for (let index = 0; index < gradeCounts[gradeKey]; index += 1) {
      participants.push(drawParticipant(random, gradeKey));
    }
  }

  return {
    situation: average(participants.map((entry) => entry.situation)),
    outfit: average(
      participants.flatMap((entry) => [
        entry.top,
        entry.bottom,
        entry.shoes,
        entry.accessory,
      ]),
    ),
    cardMatch: average(participants.map((entry) => entry.cardMatch)),
    natural: average(participants.map((entry) => entry.natural)),
    awkward: average(participants.map((entry) => entry.awkward)),
    tpoPass: average(participants.map((entry) => entry.tpoPass)),
    retry: average(participants.map((entry) => entry.retry)),
    likePass: average(participants.map((entry) => entry.likePass)),
    replayPass: average(participants.map((entry) => entry.replayPass)),
    transfer: average(participants.map((entry) => entry.transfer)),
  };
}

function classify(metrics) {
  const passed = {};
  let misses = 0;
  for (const [key, threshold, direction] of thresholds) {
    const result =
      direction === "low"
        ? metrics[key] <= threshold
        : metrics[key] >= threshold;
    passed[key] = result;
    if (!result) misses += 1;
  }
  return {
    passed,
    misses,
    decision: misses === 0 ? "GO" : misses <= 2 ? "REVISE" : "STOP",
  };
}

const random = mulberry32(seed);
const outcomeCounts = { GO: 0, REVISE: 0, STOP: 0 };
const metricPassCounts = Object.fromEntries(
  thresholds.map(([key]) => [key, 0]),
);

for (let runIndex = 0; runIndex < simulationRuns; runIndex += 1) {
  const metrics = buildMetrics(random);
  const classification = classify(metrics);
  outcomeCounts[classification.decision] += 1;
  for (const [key] of thresholds) {
    if (classification.passed[key]) metricPassCounts[key] += 1;
  }
}

const summary = {
  label: "SIMULATION · Gate 6 remediation recheck",
  warning:
    "합성 데이터 기반 사전 점검이며 실제 아동 사용성 검증을 대체하지 않습니다.",
  seed,
  simulationRuns,
  cohort: {
    total: gradeCounts.low + gradeCounts.high,
    lowGrade: gradeCounts.low,
    highGrade: gradeCounts.high,
  },
  decisionRule: {
    GO: "미달 0개",
    REVISE: "미달 1~2개",
    STOP: "미달 3개 이상",
  },
  outcomeCounts,
  outcomeRates: Object.fromEntries(
    Object.entries(outcomeCounts).map(([key, value]) => [
      key,
      value / simulationRuns,
    ]),
  ),
  metricPassRates: Object.fromEntries(
    Object.entries(metricPassCounts).map(([key, value]) => [
      key,
      value / simulationRuns,
    ]),
  ),
  implementationEvidence,
  operationalDecision: "REVISE",
  nextRequirement:
    "실제 아동 파일럿에서 호감·재시도·다음 화 의향과 18명 표본 경계 민감도를 확인",
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
