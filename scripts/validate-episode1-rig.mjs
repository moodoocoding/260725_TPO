import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rigRoot = path.join(
  root,
  "art-source",
  "character-rig",
  "otter-v1",
);
const contractPath = path.join(rigRoot, "revision-r0", "wear-contract.json");
const prototypeRoot = path.join(rigRoot, "revision-r1", "prototypes");
const reportPath = path.join(rigRoot, "revision-r1", "validation-report.json");

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const failures = [];
const results = [];

function fail(message) {
  failures.push(message);
}

function readNumberAttribute(source, name, fileName) {
  const match = source.match(new RegExp(`\\b${name}="(-?\\d+(?:\\.\\d+)?)"`));
  if (!match) {
    fail(`${fileName}: missing ${name}`);
    return Number.NaN;
  }
  return Number(match[1]);
}

if (contract.status !== "frozen" || contract.revision !== "R0") {
  fail("R0 contract must be frozen");
}

const expectedIds = contract.r1PrototypeItems;
if (!Array.isArray(expectedIds) || expectedIds.length !== 4) {
  fail("R1 must define exactly four prototype items");
}

for (const itemId of expectedIds) {
  const fileName = `${itemId}-gray.svg`;
  const absolutePath = path.join(prototypeRoot, fileName);
  let source;

  try {
    source = await readFile(absolutePath, "utf8");
  } catch {
    fail(`${fileName}: file not found`);
    continue;
  }

  const fileInfo = await stat(absolutePath);
  const viewBox = source.match(/\bviewBox="([^"]+)"/)?.[1];
  const declaredItemId = source.match(/\bdata-item-id="([^"]+)"/)?.[1];
  const slot = source.match(/\bdata-slot="([^"]+)"/)?.[1];
  const waistMode = source.match(/\bdata-waist-mode="([^"]+)"/)?.[1];
  const centerX = readNumberAttribute(source, "data-rig-center-x", fileName);
  const waistY = readNumberAttribute(source, "data-waist-y", fileName);
  const connectionLeft = readNumberAttribute(
    source,
    "data-connection-left",
    fileName,
  );
  const connectionRight = readNumberAttribute(
    source,
    "data-connection-right",
    fileName,
  );
  const overlap = readNumberAttribute(source, "data-overlap", fileName);
  const pathCount = (source.match(/<path\b/g) ?? []).length;
  const compressedBytes = gzipSync(Buffer.from(source)).byteLength;

  if (viewBox !== contract.canvas.viewBox) {
    fail(`${fileName}: viewBox must be ${contract.canvas.viewBox}`);
  }
  if (declaredItemId !== itemId) {
    fail(`${fileName}: data-item-id mismatch`);
  }
  if (!["top", "bottom"].includes(slot)) {
    fail(`${fileName}: invalid prototype slot ${slot}`);
  }
  if (!(waistMode in contract.waistModes)) {
    fail(`${fileName}: unknown waist mode ${waistMode}`);
  }
  if (
    Math.abs(centerX - contract.rig.centerX) >
    contract.rig.waistConnection.maxAnchorDrift
  ) {
    fail(`${fileName}: rig center drift exceeds tolerance`);
  }
  if (
    Math.abs(waistY - contract.rig.waistAnchor.y) >
    contract.rig.waistConnection.maxAnchorDrift
  ) {
    fail(`${fileName}: waist anchor drift exceeds tolerance`);
  }
  if (
    Math.abs(connectionLeft - contract.rig.waistConnection.left) >
      contract.rig.waistConnection.maxSideError ||
    Math.abs(connectionRight - contract.rig.waistConnection.right) >
      contract.rig.waistConnection.maxSideError
  ) {
    fail(`${fileName}: connection width exceeds tolerance`);
  }
  if (
    overlap < contract.rig.waistConnection.acceptedOverlap.min ||
    overlap > contract.rig.waistConnection.acceptedOverlap.max
  ) {
    fail(`${fileName}: overlap ${overlap}px is outside accepted range`);
  }
  if (pathCount > contract.sourcePolicy.maxPathsPerItem) {
    fail(`${fileName}: path count exceeds limit`);
  }
  if (compressedBytes > contract.sourcePolicy.maxSvgGzipBytes) {
    fail(`${fileName}: compressed SVG exceeds hard limit`);
  }
  if (/<(?:image|filter|foreignObject)\b/i.test(source)) {
    fail(`${fileName}: embedded image, filter, or foreignObject is forbidden`);
  }
  if (/\btransform\s*=/i.test(source)) {
    fail(`${fileName}: per-item SVG transforms are forbidden`);
  }

  results.push({
    itemId,
    slot,
    waistMode,
    connection: { left: connectionLeft, right: connectionRight },
    overlap,
    pathCount,
    sourceBytes: fileInfo.size,
    gzipBytes: compressedBytes,
  });
}

const topCount = results.filter((entry) => entry.slot === "top").length;
const bottomCount = results.filter((entry) => entry.slot === "bottom").length;
if (topCount !== 2 || bottomCount !== 2) {
  fail(`R1 requires two tops and two bottoms, received ${topCount}/${bottomCount}`);
}

const report = {
  revision: "R1",
  generatedAt: new Date().toISOString(),
  result: failures.length === 0 ? "passed" : "failed",
  contract: path.relative(root, contractPath).replaceAll("\\", "/"),
  prototypes: results,
  combinations: topCount * bottomCount,
  failures,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Episode 1 rig R1 passed: ${results.length} items, ${report.combinations} top/bottom combinations`,
  );
}
