export const EPISODE_ONE_SLUG = "rescue-team-trial";

const EPISODE_ONE_ROOT = `/art/v4/episodes/${EPISODE_ONE_SLUG}`;

export function getEpisodeItemAssetPath(
  episodeSlug: string | undefined,
  itemId: string,
  fileName: string,
): string | null {
  if (episodeSlug !== EPISODE_ONE_SLUG) return null;
  return `${EPISODE_ONE_ROOT}/items/${itemId}/${fileName}`;
}

export function getEpisodeOneRoot(): string {
  return EPISODE_ONE_ROOT;
}
