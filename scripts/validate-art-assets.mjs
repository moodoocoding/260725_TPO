#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const EXPECTED_CANVAS = Object.freeze({ width: 1024, height: 1536 });
const EXPECTED_THUMB = Object.freeze({ width: 512, height: 384 });
const EXPECTED_BACKGROUND = Object.freeze({ width: 1920, height: 1440 });

const BUDGETS = Object.freeze({
  thumbnail: 35 * 1024,
  wearLayerAverage: 60 * 1024,
  wearLayerMaximum: 100 * 1024,
  characterAndFaces: 300 * 1024,
  background: 300 * 1024,
  total: 2 * 1024 * 1024,
});

const ITEM_SPECS = Object.freeze({
  "yellow-raincoat": {
    slot: "top",
    layers: ["wear-back.webp", "wear-main.webp"],
  },
  "mint-windbreaker": { slot: "top", layers: ["wear-main.webp"] },
  "navy-cardigan": { slot: "top", layers: ["wear-main.webp"] },
  "cream-sweater": { slot: "top", layers: ["wear-main.webp"] },
  "active-pants": { slot: "bottom", layers: ["wear-main.webp"] },
  "sky-denim": { slot: "bottom", layers: ["wear-main.webp"] },
  "beige-shorts": { slot: "bottom", layers: ["wear-main.webp"] },
  "long-skirt": { slot: "bottom", layers: ["wear-main.webp"] },
  "rain-boots": { slot: "shoes", layers: ["wear-main.webp"] },
  sneakers: { slot: "shoes", layers: ["wear-main.webp"] },
  slippers: { slot: "shoes", layers: ["wear-main.webp"] },
  "dress-shoes": { slot: "shoes", layers: ["wear-main.webp"] },
  "clear-umbrella": {
    slot: "accessory",
    layers: ["wear-back.webp", "wear-front.webp"],
  },
  "black-umbrella": {
    slot: "accessory",
    layers: ["wear-back.webp", "wear-front.webp"],
  },
  "reflective-band": { slot: "accessory", layers: ["wear-front.webp"] },
  "canvas-tote": {
    slot: "accessory",
    layers: ["wear-back.webp", "wear-front.webp"],
  },
});

const COMMON_LAYER_FILES = Object.freeze([
  "character/base.webp",
  "character/faces/ready.webp",
  "character/faces/success.webp",
  "character/faces/retry.webp",
  "episodes/rainy-market-errand/effects/rain-back.webp",
  "episodes/rainy-market-errand/effects/rain-front.webp",
  "episodes/rainy-market-errand/effects/reflective-glow.webp",
]);

const BACKGROUND_PATH =
  "episodes/rainy-market-errand/background.webp";

function relativePath(...parts) {
  return parts.join("/").replaceAll("\\", "/");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function threeByteLittleEndian(buffer, offset) {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16)
  );
}

/**
 * WebP 헤더를 읽어 이미지 크기와 투명 채널 지원 여부를 반환한다.
 * VP8X, VP8L, VP8 세 가지 표준 청크를 지원한다.
 */
export function readWebPMetadata(buffer) {
  if (
    buffer.length < 20 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("RIFF/WEBP 헤더가 없습니다.");
  }

  let offset = 12;
  let metadata = null;
  let hasAlphaChunk = false;
  while (offset + 8 <= buffer.length) {
    const chunkName = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (dataOffset + chunkSize > buffer.length) {
      throw new Error(`${chunkName} 청크가 파일 범위를 벗어납니다.`);
    }

    if (chunkName === "VP8X") {
      if (chunkSize < 10) throw new Error("VP8X 청크가 너무 짧습니다.");
      metadata = {
        width: threeByteLittleEndian(buffer, dataOffset + 4) + 1,
        height: threeByteLittleEndian(buffer, dataOffset + 7) + 1,
        hasAlpha: (buffer[dataOffset] & 0x10) !== 0,
      };
    }

    if (chunkName === "VP8L") {
      if (chunkSize < 5 || buffer[dataOffset] !== 0x2f) {
        throw new Error("VP8L 시그니처가 올바르지 않습니다.");
      }
      const bits = buffer.readUInt32LE(dataOffset + 1);
      metadata ??= {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
        hasAlpha: null,
      };
    }

    if (chunkName === "VP8 ") {
      if (
        chunkSize < 10 ||
        buffer[dataOffset + 3] !== 0x9d ||
        buffer[dataOffset + 4] !== 0x01 ||
        buffer[dataOffset + 5] !== 0x2a
      ) {
        throw new Error("VP8 프레임 헤더가 올바르지 않습니다.");
      }
      metadata ??= {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
        hasAlpha: hasAlphaChunk,
      };
    }

    if (chunkName === "ALPH") {
      hasAlphaChunk = true;
      if (metadata) metadata.hasAlpha = true;
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  if (!metadata) {
    throw new Error("크기를 판독할 수 있는 WebP 이미지 청크가 없습니다.");
  }
  if (hasAlphaChunk) metadata.hasAlpha = true;
  return metadata;
}

export function readWebPDimensions(buffer) {
  const { width, height } = readWebPMetadata(buffer);
  return { width, height };
}

function parseGameItems(source) {
  const clothingBlock = source.match(
    /export\s+const\s+CLOTHING_ITEMS[\s\S]*?=\s*\[([\s\S]*?)\]\s*;/,
  );

  if (!clothingBlock) {
    throw new Error("CLOTHING_ITEMS 배열을 찾을 수 없습니다.");
  }

  const items = new Map();
  const itemPattern =
    /\bid\s*:\s*["']([a-z0-9-]+)["'][\s\S]*?\bslot\s*:\s*["'](top|bottom|shoes|accessory)["']/g;

  for (const match of clothingBlock[1].matchAll(itemPattern)) {
    if (items.has(match[1])) {
      throw new Error(`게임 데이터에 중복 ID가 있습니다: ${match[1]}`);
    }
    items.set(match[1], match[2]);
  }

  if (items.size === 0) {
    throw new Error("게임 데이터에서 아이템 ID와 슬롯을 읽지 못했습니다.");
  }

  return items;
}

async function pathStat(target) {
  try {
    return await fs.stat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function listFilesRecursively(directory) {
  const stat = await pathStat(directory);
  if (!stat?.isDirectory()) return [];

  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

function makeReporter(errors, warnings) {
  return {
    error(code, file, message) {
      errors.push({ level: "error", code, file, message });
    },
    warning(code, file, message) {
      warnings.push({ level: "warning", code, file, message });
    },
  };
}

async function validateWebPFile({
  absolutePath,
  displayPath,
  reporter,
  expectedDimensions,
  maximumBytes,
  requireAlpha = false,
}) {
  const stat = await pathStat(absolutePath);
  if (!stat?.isFile()) {
    reporter.error("MISSING_FILE", displayPath, "필수 WebP 파일이 없습니다.");
    return null;
  }

  if (stat.size > maximumBytes) {
    reporter.error(
      "FILE_BUDGET",
      displayPath,
      `${formatBytes(stat.size)}로 상한 ${formatBytes(maximumBytes)}을 초과했습니다.`,
    );
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const metadata = readWebPMetadata(buffer);
    if (
      metadata.width !== expectedDimensions.width ||
      metadata.height !== expectedDimensions.height
    ) {
      reporter.error(
        "IMAGE_SIZE",
        displayPath,
        `${metadata.width}×${metadata.height}px입니다. ` +
          `${expectedDimensions.width}×${expectedDimensions.height}px이어야 합니다.`,
      );
    }
    if (requireAlpha && metadata.hasAlpha !== true) {
      reporter.error(
        "MISSING_ALPHA",
        displayPath,
        "캐릭터·착용·효과 레이어는 투명 채널이 있는 WebP여야 합니다.",
      );
    }
  } catch (error) {
    reporter.error("INVALID_WEBP", displayPath, error.message);
  }

  return stat.size;
}

function compareSets({ expected, actual, reporter, code, label, file }) {
  for (const value of expected) {
    if (!actual.has(value)) {
      reporter.error(code, file, `${label}에 "${value}"가 없습니다.`);
    }
  }
  for (const value of actual) {
    if (!expected.has(value)) {
      reporter.error(code, file, `${label}에 알 수 없는 "${value}"가 있습니다.`);
    }
  }
}

/**
 * 첫 번째 에피소드의 v1 아트 시스템 전체를 정적 검증한다.
 */
export async function validateArtAssets(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const artRoot = path.resolve(
    projectRoot,
    options.artRoot ?? "public/art/v1",
  );
  const gameDataPath = path.resolve(
    projectRoot,
    options.gameDataPath ?? "lib/game-data.ts",
  );
  const errors = [];
  const warnings = [];
  const reporter = makeReporter(errors, warnings);
  const summary = {
    expectedItems: Object.keys(ITEM_SPECS).length,
    gameItems: 0,
    manifestItems: 0,
    thumbnails: 0,
    wearLayers: 0,
    totalBytes: 0,
  };

  const gameDataStat = await pathStat(gameDataPath);
  let gameItems = new Map();
  if (!gameDataStat?.isFile()) {
    reporter.error(
      "MISSING_GAME_DATA",
      path.relative(projectRoot, gameDataPath),
      "게임 데이터 파일이 없습니다.",
    );
  } else {
    try {
      gameItems = parseGameItems(await fs.readFile(gameDataPath, "utf8"));
      summary.gameItems = gameItems.size;
    } catch (error) {
      reporter.error(
        "INVALID_GAME_DATA",
        path.relative(projectRoot, gameDataPath),
        error.message,
      );
    }
  }

  const expectedIds = new Set(Object.keys(ITEM_SPECS));
  compareSets({
    expected: expectedIds,
    actual: new Set(gameItems.keys()),
    reporter,
    code: "GAME_ITEM_SET",
    label: "CLOTHING_ITEMS",
    file: path.relative(projectRoot, gameDataPath),
  });

  const artRootStat = await pathStat(artRoot);
  if (!artRootStat?.isDirectory()) {
    reporter.error(
      "MISSING_ART_ROOT",
      path.relative(projectRoot, artRoot),
      "아트 루트 디렉터리가 없습니다.",
    );
    return {
      ok: false,
      errors,
      warnings,
      summary,
      paths: { projectRoot, artRoot, gameDataPath },
    };
  }

  const manifestPath = path.join(artRoot, "art-manifest.json");
  let manifest = null;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    reporter.error(
      error?.code === "ENOENT" ? "MISSING_MANIFEST" : "INVALID_MANIFEST",
      relativePath("public", "art", "v1", "art-manifest.json"),
      error?.code === "ENOENT"
        ? "art-manifest.json이 없습니다."
        : `JSON을 읽을 수 없습니다: ${error.message}`,
    );
  }

  if (manifest) {
    if (manifest.version !== 1) {
      reporter.error(
        "MANIFEST_VERSION",
        "public/art/v1/art-manifest.json",
        "version은 1이어야 합니다.",
      );
    }
    if (
      manifest.canvas?.width !== EXPECTED_CANVAS.width ||
      manifest.canvas?.height !== EXPECTED_CANVAS.height
    ) {
      reporter.error(
        "CANVAS_SIZE",
        "public/art/v1/art-manifest.json",
        `canvas는 ${EXPECTED_CANVAS.width}×${EXPECTED_CANVAS.height}px이어야 합니다.`,
      );
    }

    const expectedManifestPaths = [
      ["character.base", manifest.character?.base, "character/base.webp"],
      [
        "character.faces.ready",
        manifest.character?.faces?.ready,
        "character/faces/ready.webp",
      ],
      [
        "character.faces.success",
        manifest.character?.faces?.success,
        "character/faces/success.webp",
      ],
      [
        "character.faces.retry",
        manifest.character?.faces?.retry,
        "character/faces/retry.webp",
      ],
      [
        "episode.background",
        manifest.episode?.background,
        BACKGROUND_PATH,
      ],
      [
        "episode.effects.rainBack.src",
        manifest.episode?.effects?.rainBack?.src,
        "episodes/rainy-market-errand/effects/rain-back.webp",
      ],
      [
        "episode.effects.rainFront.src",
        manifest.episode?.effects?.rainFront?.src,
        "episodes/rainy-market-errand/effects/rain-front.webp",
      ],
      [
        "episode.effects.reflectiveGlow.src",
        manifest.episode?.effects?.reflectiveGlow?.src,
        "episodes/rainy-market-errand/effects/reflective-glow.webp",
      ],
    ];
    for (const [field, actual, expected] of expectedManifestPaths) {
      if (actual !== expected) {
        reporter.error(
          "MANIFEST_PATH",
          "public/art/v1/art-manifest.json",
          `${field}는 "${expected}"여야 합니다.`,
        );
      }
    }
  }

  const manifestItems = new Map();
  if (Array.isArray(manifest?.items)) {
    for (const item of manifest.items) {
      if (!item || typeof item.id !== "string") {
        reporter.error(
          "INVALID_MANIFEST_ITEM",
          "public/art/v1/art-manifest.json",
          "items 배열의 각 항목에는 문자열 id가 필요합니다.",
        );
      } else if (manifestItems.has(item.id)) {
        reporter.error(
          "DUPLICATE_MANIFEST_ITEM",
          "public/art/v1/art-manifest.json",
          `중복 아이템 ID가 있습니다: ${item.id}`,
        );
      } else {
        manifestItems.set(item.id, item);
      }
    }
  } else if (manifest) {
    reporter.error(
      "INVALID_MANIFEST_ITEMS",
      "public/art/v1/art-manifest.json",
      "items는 아이템 객체 배열이어야 합니다.",
    );
  }

  summary.manifestItems = manifestItems.size;
  compareSets({
    expected: new Set(gameItems.keys()),
    actual: new Set(manifestItems.keys()),
    reporter,
    code: "MANIFEST_ITEM_SET",
    label: "매니페스트 items",
    file: "public/art/v1/art-manifest.json",
  });

  const itemsRoot = path.join(artRoot, "items");
  const itemDirectoryEntries = (await pathStat(itemsRoot))?.isDirectory()
    ? await fs.readdir(itemsRoot, { withFileTypes: true })
    : [];
  const itemDirectories = new Set(
    itemDirectoryEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  compareSets({
    expected: new Set(gameItems.keys()),
    actual: itemDirectories,
    reporter,
    code: "ITEM_DIRECTORY_SET",
    label: "items 디렉터리",
    file: "public/art/v1/items",
  });

  const wearSizes = [];
  for (const [itemId, spec] of Object.entries(ITEM_SPECS)) {
    const gameSlot = gameItems.get(itemId);
    if (gameSlot && gameSlot !== spec.slot) {
      reporter.error(
        "SLOT_MISMATCH",
        path.relative(projectRoot, gameDataPath),
        `${itemId} 슬롯은 "${spec.slot}"이어야 하지만 "${gameSlot}"입니다.`,
      );
    }

    const itemManifest = manifestItems.get(itemId);
    if (!itemManifest || typeof itemManifest !== "object") continue;

    if (itemManifest.slot !== gameSlot) {
      reporter.error(
        "SLOT_MISMATCH",
        "public/art/v1/art-manifest.json",
        `${itemId}의 매니페스트 슬롯 "${itemManifest.slot}"이 게임 슬롯 "${gameSlot}"과 다릅니다.`,
      );
    }

    const expectedThumbnail = `items/${itemId}/thumb.webp`;
    if (itemManifest.thumbnail !== expectedThumbnail) {
      reporter.error(
        "THUMBNAIL_PATH",
        "public/art/v1/art-manifest.json",
        `${itemId}.thumbnail은 "${expectedThumbnail}"이어야 합니다.`,
      );
    }

    const manifestLayers = Array.isArray(itemManifest.layers)
      ? itemManifest.layers
      : [];
    const manifestLayerPaths = new Set();
    for (const layer of manifestLayers) {
      if (
        !layer ||
        typeof layer.src !== "string" ||
        !Number.isFinite(layer.z)
      ) {
        reporter.error(
          "INVALID_LAYER",
          "public/art/v1/art-manifest.json",
          `${itemId}의 각 레이어에는 src와 숫자 z가 필요합니다.`,
        );
        continue;
      }

      const normalizedSrc = layer.src.replaceAll("\\", "/");
      manifestLayerPaths.add(normalizedSrc);
      const absoluteLayerPath = path.resolve(artRoot, normalizedSrc);
      if (!isInside(artRoot, absoluteLayerPath)) {
        reporter.error(
          "UNSAFE_PATH",
          "public/art/v1/art-manifest.json",
          `${itemId} 레이어가 art/v1 밖을 참조합니다: ${layer.src}`,
        );
      }
    }

    for (const layerFile of spec.layers) {
      const expectedLayer = `items/${itemId}/${layerFile}`;
      if (!manifestLayerPaths.has(expectedLayer)) {
        reporter.error(
          "REQUIRED_LAYER",
          "public/art/v1/art-manifest.json",
          `${itemId}에 필수 레이어 "${expectedLayer}"가 없습니다.`,
        );
      }
    }
  }

  for (const [itemId, spec] of Object.entries(ITEM_SPECS)) {
    const thumbnailPath = path.join(itemsRoot, itemId, "thumb.webp");
    await validateWebPFile({
      absolutePath: thumbnailPath,
      displayPath: `public/art/v1/items/${itemId}/thumb.webp`,
      reporter,
      expectedDimensions: EXPECTED_THUMB,
      maximumBytes: BUDGETS.thumbnail,
    });

    for (const layerFile of spec.layers) {
      const layerPath = path.join(itemsRoot, itemId, layerFile);
      const size = await validateWebPFile({
        absolutePath: layerPath,
        displayPath: `public/art/v1/items/${itemId}/${layerFile}`,
        reporter,
        expectedDimensions: EXPECTED_CANVAS,
        maximumBytes: BUDGETS.wearLayerMaximum,
        requireAlpha: true,
      });
      if (size !== null) {
        wearSizes.push(size);
        summary.wearLayers += 1;
      }
    }
  }

  const allArtFiles = await listFilesRecursively(artRoot);
  summary.totalBytes = (
    await Promise.all(allArtFiles.map((file) => fs.stat(file)))
  ).reduce((total, stat) => total + stat.size, 0);

  const thumbnailFiles = allArtFiles.filter(
    (file) =>
      path.basename(file) === "thumb.webp" &&
      isInside(itemsRoot, file),
  );
  summary.thumbnails = thumbnailFiles.length;
  if (thumbnailFiles.length !== Object.keys(ITEM_SPECS).length) {
    reporter.error(
      "THUMBNAIL_COUNT",
      "public/art/v1/items",
      `thumb.webp가 ${thumbnailFiles.length}개입니다. 정확히 16개여야 합니다.`,
    );
  }

  if (wearSizes.length > 0) {
    const wearAverage =
      wearSizes.reduce((total, size) => total + size, 0) / wearSizes.length;
    if (wearAverage > BUDGETS.wearLayerAverage) {
      reporter.error(
        "AVERAGE_LAYER_BUDGET",
        "public/art/v1/items",
        `착용 레이어 평균이 ${formatBytes(wearAverage)}로 ` +
          `${formatBytes(BUDGETS.wearLayerAverage)} 상한을 초과했습니다.`,
      );
    }
  }

  let characterAndFacesBytes = 0;
  for (const commonFile of COMMON_LAYER_FILES) {
    const size = await validateWebPFile({
      absolutePath: path.join(artRoot, commonFile),
      displayPath: `public/art/v1/${commonFile}`,
      reporter,
      expectedDimensions: EXPECTED_CANVAS,
      maximumBytes: BUDGETS.wearLayerMaximum,
      requireAlpha: true,
    });
    if (
      size !== null &&
      (commonFile === "character/base.webp" ||
        commonFile.startsWith("character/faces/"))
    ) {
      characterAndFacesBytes += size;
    }
  }
  if (characterAndFacesBytes > BUDGETS.characterAndFaces) {
    reporter.error(
      "CHARACTER_BUDGET",
      "public/art/v1/character",
      `기본 캐릭터와 표정 합계가 ${formatBytes(characterAndFacesBytes)}로 ` +
        `${formatBytes(BUDGETS.characterAndFaces)} 상한을 초과했습니다.`,
    );
  }

  await validateWebPFile({
    absolutePath: path.join(artRoot, BACKGROUND_PATH),
    displayPath: `public/art/v1/${BACKGROUND_PATH}`,
    reporter,
    expectedDimensions: EXPECTED_BACKGROUND,
    maximumBytes: BUDGETS.background,
  });

  const forbiddenRuntimeFiles = allArtFiles.filter(
    (file) => [".png", ".svg"].includes(path.extname(file).toLowerCase()),
  );
  for (const forbiddenFile of forbiddenRuntimeFiles) {
    const extension = path.extname(forbiddenFile).slice(1).toUpperCase();
    reporter.error(
      `RUNTIME_${extension}`,
      path.relative(projectRoot, forbiddenFile).replaceAll("\\", "/"),
      `${extension}는 public/art/v1 런타임 경로에 포함할 수 없습니다. 투명 WebP를 사용하세요.`,
    );
  }

  if (summary.totalBytes > BUDGETS.total) {
    reporter.error(
      "TOTAL_BUDGET",
      "public/art/v1",
      `전체 아트가 ${formatBytes(summary.totalBytes)}로 ${formatBytes(BUDGETS.total)} 상한을 초과했습니다.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary,
    paths: { projectRoot, artRoot, gameDataPath },
  };
}

function printHumanResult(result) {
  const { summary } = result;
  console.log(
    `아트 검증: ${result.ok ? "통과" : "실패"} ` +
      `(게임 ${summary.gameItems}/16, 매니페스트 ${summary.manifestItems}/16, ` +
      `썸네일 ${summary.thumbnails}/16, 착용 레이어 ${summary.wearLayers}, ` +
      `전체 ${formatBytes(summary.totalBytes)})`,
  );

  for (const diagnostic of [...result.errors, ...result.warnings]) {
    const marker = diagnostic.level === "error" ? "오류" : "경고";
    console.log(
      `[${marker}] ${diagnostic.code} · ${diagnostic.file}\n  ${diagnostic.message}`,
    );
  }
}

function parseCliArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--root") {
      options.projectRoot = argv[++index];
    } else if (argument === "--art-root") {
      options.artRoot = argv[++index];
    } else if (argument === "--game-data") {
      options.gameDataPath = argv[++index];
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`알 수 없는 옵션입니다: ${argument}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`사용법: node scripts/validate-art-assets.mjs [옵션]

옵션:
  --root <경로>       프로젝트 루트 (기본값: 현재 디렉터리)
  --art-root <경로>   프로젝트 루트 기준 아트 경로 (기본값: public/art/v1)
  --game-data <경로>  프로젝트 루트 기준 게임 데이터 (기본값: lib/game-data.ts)
  --json              기계 판독용 JSON 출력
  -h, --help          도움말`);
}

async function runCli() {
  try {
    const options = parseCliArguments(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }

    const result = await validateArtAssets(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHumanResult(result);
    }
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`아트 검증기를 실행하지 못했습니다: ${error.message}`);
    process.exitCode = 2;
  }
}

const entryUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (entryUrl === import.meta.url) {
  await runCli();
}
