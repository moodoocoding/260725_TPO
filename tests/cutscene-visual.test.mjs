import assert from "node:assert/strict";
import test from "node:test";

import { getCutsceneVisualEpisodeSlug } from "../lib/cutscene-visual.ts";

const common = {
  activeEpisodeSlug: "school-pe-rush",
  protagonistEpisodeSlug: "rescue-team-trial",
};

test("챕터 도입부에는 주인공 하루의 비주얼을 사용한다", () => {
  assert.equal(
    getCutsceneVisualEpisodeSlug({
      ...common,
      stage: "chapterIntro",
    }),
    "rescue-team-trial",
  );
});

test("에피소드 도입부에는 해당 에피소드 친구를 사용한다", () => {
  assert.equal(
    getCutsceneVisualEpisodeSlug({
      ...common,
      stage: "episodeIntro",
    }),
    "school-pe-rush",
  );
});

test("챕터 종료의 다음 장 예고에는 다음 친구를 사용한다", () => {
  assert.equal(
    getCutsceneVisualEpisodeSlug({
      ...common,
      stage: "chapterOutro",
      isNextChapterHook: true,
      nextEpisodeSlug: "rainy-market-errand",
    }),
    "rainy-market-errand",
  );
});
