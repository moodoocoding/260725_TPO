import assert from "node:assert/strict";
import test from "node:test";

import {
  EPISODE_ONE_SLUG,
  getEpisodeItemAssetPath,
} from "../lib/art-paths.ts";

test("1화 안전모는 1화 전용 썸네일과 착용 레이어를 사용한다", () => {
  const root = `/art/v4/episodes/${EPISODE_ONE_SLUG}/items/rescue-cap`;

  assert.equal(
    getEpisodeItemAssetPath(EPISODE_ONE_SLUG, "rescue-cap", "thumb.webp"),
    `${root}/thumb.webp`,
  );
  assert.equal(
    getEpisodeItemAssetPath(
      EPISODE_ONE_SLUG,
      "rescue-cap",
      "wear-back.webp",
    ),
    `${root}/wear-back.webp`,
  );
  assert.equal(
    getEpisodeItemAssetPath(
      EPISODE_ONE_SLUG,
      "rescue-cap",
      "wear-front.webp",
    ),
    `${root}/wear-front.webp`,
  );
});

test("다른 에피소드는 1화 전용 경로를 사용하지 않는다", () => {
  assert.equal(
    getEpisodeItemAssetPath("ski-resort", "ski-helmet", "wear-main.webp"),
    null,
  );
});
