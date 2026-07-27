export type CutsceneVisualStage =
  | "chapterIntro"
  | "episodeIntro"
  | "chapterOutro";

type CutsceneVisualInput = {
  stage: CutsceneVisualStage;
  activeEpisodeSlug: string;
  protagonistEpisodeSlug: string;
  nextEpisodeSlug?: string;
  isNextChapterHook?: boolean;
};

export function getCutsceneVisualEpisodeSlug({
  stage,
  activeEpisodeSlug,
  protagonistEpisodeSlug,
  nextEpisodeSlug,
  isNextChapterHook = false,
}: CutsceneVisualInput): string {
  if (stage === "chapterIntro") {
    return protagonistEpisodeSlug;
  }

  if (
    stage === "chapterOutro" &&
    isNextChapterHook &&
    nextEpisodeSlug
  ) {
    return nextEpisodeSlug;
  }

  return activeEpisodeSlug;
}
