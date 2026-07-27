export type EpisodeProgress = {
  completed: boolean;
  stars: number;
  bestScore: number;
};

export type StoryProgress = {
  version: 3;
  episodes: Record<string, EpisodeProgress>;
  seenChapterOpenings: string[];
  seenChapterEndings: string[];
};

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type StorageFactory = () => StorageLike;

type ParsedProgress = Partial<StoryProgress> & {
  version?: number;
};

export function createEmptyProgress(): StoryProgress {
  return {
    version: 3,
    episodes: {},
    seenChapterOpenings: [],
    seenChapterEndings: [],
  };
}

export function parseStoryProgress(
  raw: string | null,
  episodeSlugs: ReadonlySet<string>,
  chapterIds: ReadonlySet<string>,
): StoryProgress | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ParsedProgress | null;
    if (
      !parsed ||
      ![2, 3].includes(parsed.version ?? 0) ||
      !parsed.episodes ||
      typeof parsed.episodes !== "object" ||
      Array.isArray(parsed.episodes)
    ) {
      return null;
    }

    const episodes: Record<string, EpisodeProgress> = {};
    for (const episodeSlug of episodeSlugs) {
      const value = parsed.episodes[episodeSlug];
      if (!value || typeof value !== "object") continue;

      const score = Number(value.bestScore);
      const stars = Number(value.stars);
      if (!Number.isFinite(score) || !Number.isFinite(stars)) continue;

      const bestScore = Math.max(0, Math.min(100, Math.round(score)));
      const safeStars = Math.max(0, Math.min(3, Math.round(stars)));
      episodes[episodeSlug] = {
        bestScore,
        stars: safeStars,
        completed: bestScore >= 60 && safeStars >= 1,
      };
    }

    const filterChapterIds = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter(
            (id): id is string =>
              typeof id === "string" && chapterIds.has(id),
          )
        : [];

    return {
      version: 3,
      episodes,
      seenChapterOpenings:
        parsed.version === 3
          ? filterChapterIds(parsed.seenChapterOpenings)
          : [],
      seenChapterEndings:
        parsed.version === 3
          ? filterChapterIds(parsed.seenChapterEndings)
          : [],
    };
  } catch {
    return null;
  }
}

export function loadStoryProgress(
  getStorage: StorageFactory,
  keys: readonly string[],
  episodeSlugs: ReadonlySet<string>,
  chapterIds: ReadonlySet<string>,
): { progress: StoryProgress; storageAvailable: boolean } {
  try {
    const storage = getStorage();
    for (const key of keys) {
      const parsed = parseStoryProgress(
        storage.getItem(key),
        episodeSlugs,
        chapterIds,
      );
      if (parsed) {
        return { progress: parsed, storageAvailable: true };
      }
    }
    return { progress: createEmptyProgress(), storageAvailable: true };
  } catch {
    return { progress: createEmptyProgress(), storageAvailable: false };
  }
}

export function readStorageNumber(
  getStorage: StorageFactory,
  key: string,
): { value: number; storageAvailable: boolean } {
  try {
    const value = Number(getStorage().getItem(key) || 0);
    return {
      value: Number.isFinite(value) ? value : 0,
      storageAvailable: true,
    };
  } catch {
    return { value: 0, storageAvailable: false };
  }
}

export function writeStorageValues(
  getStorage: StorageFactory,
  values: readonly (readonly [key: string, value: string])[],
): boolean {
  try {
    const storage = getStorage();
    for (const [key, value] of values) {
      storage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}
