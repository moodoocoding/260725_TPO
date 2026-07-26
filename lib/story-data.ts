import catalogJson from "@/lib/story-catalog.json";

export type Slot = "top" | "bottom" | "shoes" | "accessory";
export type WearLayerKind = "back" | "main" | "front";
export type ScoreCategory = "tpo" | "function" | "expression";

export type ClothingItem = {
  id: string;
  name: string;
  slot: Slot;
  color: string;
  accent: string;
  symbol: string;
  styleKey: string;
  tags: string[];
  note: string;
  layerKinds: WearLayerKind[];
};

export type ScoreCriterion = {
  category: ScoreCategory;
  anyTags: string[];
  points: number;
  strength: string;
  improvement: string;
};

export type MandatoryRule = {
  label: string;
  anyTags: string[];
  improvement: string;
};

export type ForbiddenRule = {
  tag: string;
  penalty: number;
  feedback: string;
};

export type StoryEpisode = {
  slug: string;
  chapterId: string;
  order: number;
  title: string;
  kicker: string;
  teaser: string;
  sender: string;
  weatherIcon: string;
  weatherLabel: string;
  weatherNote: string;
  backgroundStyle: string;
  backgroundColors: [string, string];
  timeLimitSeconds: number;
  tpo: {
    time: string;
    place: string;
    occasion: string;
  };
  messages: Array<{
    speaker: string;
    text: string;
  }>;
  itemIds: string[];
  itemRoles?: Record<
    string,
    "best" | "acceptable" | "partial" | "mismatch"
  >;
  canonicalItemIds?: string[];
  rules: {
    criteria: ScoreCriterion[];
    mandatory: MandatoryRule[];
    forbidden: ForbiddenRule[];
  };
  successTitle: string;
  retryTitle: string;
};

export type StoryChapter = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  episodeSlugs: string[];
};

type StoryCatalog = {
  version: number;
  generatedAt: string;
  slots: Slot[];
  chapters: StoryChapter[];
  items: ClothingItem[];
  episodes: StoryEpisode[];
};

const catalog = catalogJson as unknown as StoryCatalog;

export const SLOT_LABELS: Record<Slot, string> = {
  top: "겉옷",
  bottom: "하의",
  shoes: "신발",
  accessory: "소품",
};

export const STORY_CHAPTERS = catalog.chapters;
export const STORY_EPISODES = catalog.episodes;
export const CLOTHING_ITEMS = catalog.items;
export const STORY_CATALOG_VERSION = catalog.version;
export const STORY_SLOTS = catalog.slots;
export const CLOTHING_ITEM_IDS = catalog.items.map((item) => item.id);

const episodesBySlug = new Map(
  STORY_EPISODES.map((episode) => [episode.slug, episode]),
);
const itemsById = new Map(CLOTHING_ITEMS.map((item) => [item.id, item]));

export function getEpisode(slug: string): StoryEpisode | undefined {
  return episodesBySlug.get(slug);
}

export function getItemsForEpisode(
  episodeOrSlug: StoryEpisode | string,
): ClothingItem[] {
  const episode =
    typeof episodeOrSlug === "string"
      ? getEpisode(episodeOrSlug)
      : episodeOrSlug;

  if (!episode) return [];

  return episode.itemIds.flatMap((itemId) => {
    const catalogItem = itemsById.get(itemId);
    return catalogItem ? [catalogItem] : [];
  });
}

export function getItem(itemId: string): ClothingItem | undefined {
  return itemsById.get(itemId);
}

export function getNextEpisode(
  episodeOrSlug: StoryEpisode | string,
): StoryEpisode | undefined {
  const episode =
    typeof episodeOrSlug === "string"
      ? getEpisode(episodeOrSlug)
      : episodeOrSlug;

  return episode
    ? STORY_EPISODES.find((candidate) => candidate.order === episode.order + 1)
    : undefined;
}
