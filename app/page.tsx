"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  CharacterRenderer,
  ItemThumbnail,
} from "@/components/character-renderer";
import { StoryCutscene } from "@/components/story-cutscene";
import { getEpisodeBackground } from "@/lib/art-manifest";
import { getRemainingSeconds } from "@/lib/game-timer";
import {
  createEmptyProgress,
  loadStoryProgress,
  readStorageNumber,
  writeStorageValues,
  type StoryProgress,
} from "@/lib/progress-storage";
import { getCutsceneVisualEpisodeSlug } from "@/lib/cutscene-visual";
import type { ScoreResult } from "@/lib/scoring";
import {
  STORY_FINAL_ENDING,
  STORY_NARRATIVE_TITLE,
  getChapterNarrative,
  getEpisodeNarrative,
} from "@/lib/story-narrative";
import { getEpisodeLearning } from "@/lib/tpo-learning";
import {
  SLOT_LABELS,
  STORY_CHAPTERS,
  STORY_EPISODES,
  STORY_SLOTS,
  getEpisode,
  getItemsForEpisode,
  getItemsForEpisodeSlot,
  getNextEpisode,
  type ClothingItem,
  type Slot,
  type StoryEpisode,
} from "@/lib/story-data";

type Stage =
  | "welcome"
  | "login"
  | "modes"
  | "story"
  | "chapterIntro"
  | "episodeIntro"
  | "messages"
  | "dress"
  | "result"
  | "chapterOutro";

type Selection = Partial<Record<Slot, string>>;

const PROGRESS_KEY = "tpo-story-progress-v3";
const LEGACY_PROGRESS_KEY = "tpo-story-progress-v2";
const nowInMilliseconds = () => Date.now();
const EMPTY_PROGRESS = createEmptyProgress();
const STORY_EPISODE_SLUGS = new Set(
  STORY_EPISODES.map((episode) => episode.slug),
);
const STORY_CHAPTER_IDS = new Set(
  STORY_CHAPTERS.map((chapter) => chapter.id),
);
const slots = STORY_SLOTS;
const firstEpisode = STORY_EPISODES[0];
const SCORE_LABELS: Array<[keyof ScoreResult["breakdown"], string, number]> = [
  ["tpo", "TPO 적합성", 30],
  ["function", "보호·안전", 30],
  ["expression", "예절·표현", 20],
  ["completeness", "코디 완성도", 10],
  ["time", "시간 보너스", 10],
];

function getConversationLabel(sender: string) {
  const trimmedSender = sender.trim();
  const lastCharacter = trimmedSender.at(-1);

  if (!lastCharacter) {
    return "문자 대화";
  }

  const codePoint = lastCharacter.charCodeAt(0);
  const isHangulSyllable = codePoint >= 0xac00 && codePoint <= 0xd7a3;
  const hasFinalConsonant =
    isHangulSyllable && (codePoint - 0xac00) % 28 !== 0;

  return `${trimmedSender}${hasFinalConsonant ? "과" : "와"}의 문자 대화`;
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span>T</span>
      <span>P</span>
      <span>O</span>
    </span>
  );
}

function AppHeader({
  onHome,
  bestScore,
  homeLabel = "모드 선택으로 이동",
  notice,
}: {
  onHome: () => void;
  bestScore: number;
  homeLabel?: string;
  notice?: string;
}) {
  return (
    <header className="app-header">
      <button className="brand-button" onClick={onHome} aria-label={homeLabel}>
        <LogoMark />
        <span>스타일 구조대</span>
      </button>
      {notice && (
        <p className="header-notice" role="status">
          {notice}
        </p>
      )}
      <div className="header-score" aria-label={`전체 최고 점수 ${bestScore}점`}>
        <span aria-hidden="true">★</span>
        <strong>{bestScore}</strong>
        <small>BEST</small>
      </div>
    </header>
  );
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="star-rating" aria-label={`별 ${stars}개`}>
      {[0, 1, 2].map((index) => (
        <span key={index} className={index < stars ? "star-on" : ""}>
          ★
        </span>
      ))}
    </div>
  );
}

function EpisodeStars({ stars }: { stars: number }) {
  return (
    <span className="episode-stars" aria-label={`최고 별 ${stars}개`}>
      {[0, 1, 2].map((index) => (
        <span key={index} className={index < stars ? "" : "star-empty"}>
          ★
        </span>
      ))}
    </span>
  );
}

function getAvatarStyle(episode: StoryEpisode): CSSProperties {
  return {
    "--episode-background-image": `url("${getEpisodeBackground(episode.slug)}")`,
    "--episode-color-a": episode.backgroundColors[0],
    "--episode-color-b": episode.backgroundColors[1],
  } as CSSProperties;
}

function getChapterStyle(color: string): CSSProperties {
  return { "--chapter-accent": color } as CSSProperties;
}

function getWearerName(episode: StoryEpisode): string {
  return episode.slug === "rescue-team-trial" ? "하루" : episode.sender;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [activeEpisodeSlug, setActiveEpisodeSlug] = useState(firstEpisode.slug);
  const [activeSlot, setActiveSlot] = useState<Slot>("top");
  const [selection, setSelection] = useState<Selection>({});
  const [timeLeft, setTimeLeft] = useState(firstEpisode.timeLimitSeconds);
  const [timerStarted, setTimerStarted] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [progress, setProgress] = useState<StoryProgress>(EMPTY_PROGRESS);
  const [legacyBestScore, setLegacyBestScore] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [reasonRevealed, setReasonRevealed] = useState(false);
  const [transferChoice, setTransferChoice] = useState<string | null>(null);
  const [cutsceneIndex, setCutsceneIndex] = useState(0);
  const startedAtRef = useRef(0);
  const deadlineAtRef = useRef(0);
  const submitLockRef = useRef(false);
  const timeoutHandledRef = useRef(false);

  const activeEpisode =
    getEpisode(activeEpisodeSlug) ?? firstEpisode;
  const episodeItems = useMemo(
    () => getItemsForEpisode(activeEpisode),
    [activeEpisode],
  );
  const selectedItems = useMemo(
    () =>
      slots
        .map((slot) =>
          episodeItems.find((item) => item.id === selection[slot]),
        )
        .filter((item): item is ClothingItem => Boolean(item)),
    [episodeItems, selection],
  );
  const isOutfitComplete = selectedItems.length === slots.length;
  const completedCount = STORY_EPISODES.filter(
    (episode) => progress.episodes[episode.slug]?.completed,
  ).length;
  const bestScore = Math.max(
    legacyBestScore,
    0,
    ...Object.values(progress.episodes).map((entry) => entry.bestScore),
  );
  const activeProgress = progress.episodes[activeEpisode.slug];
  const nextEpisode = getNextEpisode(activeEpisode);
  const episodeLearning = getEpisodeLearning(activeEpisode.slug);
  const activeChapter =
    STORY_CHAPTERS.find(
      (chapter) => chapter.id === activeEpisode.chapterId,
    ) ?? STORY_CHAPTERS[0];
  const chapterNarrative = getChapterNarrative(activeChapter.id);
  const episodeNarrative = getEpisodeNarrative(activeEpisode.slug);
  const wearerName = getWearerName(activeEpisode);
  const transferPassed =
    !episodeLearning ||
    transferChoice === episodeLearning.transfer.correctOptionId;
  const hasTimedOut =
    stage === "dress" && timerStarted && timeLeft === 0;

  useEffect(() => {
    const syncStoredProgress = window.setTimeout(() => {
      const storedProgress = loadStoryProgress(
        () => window.localStorage,
        [PROGRESS_KEY, LEGACY_PROGRESS_KEY],
        STORY_EPISODE_SLUGS,
        STORY_CHAPTER_IDS,
      );
      const storedBestScore = readStorageNumber(
        () => window.localStorage,
        "tpo-best-score",
      );
      setProgress(storedProgress.progress);
      setLegacyBestScore(storedBestScore.value);
      if (
        !storedProgress.storageAvailable ||
        !storedBestScore.storageAvailable
      ) {
        setStorageWarning(
          "진행 저장을 사용할 수 없어요.",
        );
      }
      setProgressLoaded(true);
    }, 0);
    return () => window.clearTimeout(syncStoredProgress);
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    const saved = writeStorageValues(
      () => window.localStorage,
      [
        [PROGRESS_KEY, JSON.stringify(progress)],
        ["tpo-best-score", String(bestScore)],
      ],
    );
    if (!saved) {
      const warningTimer = window.setTimeout(() => {
        setStorageWarning("진행 저장을 사용할 수 없어요.");
      }, 0);
      return () => window.clearTimeout(warningTimer);
    }
  }, [bestScore, progress, progressLoaded]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  const isEpisodeUnlocked = useCallback(
    (episode: StoryEpisode) => {
      const index = STORY_EPISODES.findIndex(
        (candidate) => candidate.slug === episode.slug,
      );
      return (
        index === 0 ||
        Boolean(progress.episodes[STORY_EPISODES[index - 1]?.slug]?.completed)
      );
    },
    [progress.episodes],
  );

  const openEpisode = useCallback(
    (episode: StoryEpisode) => {
      if (!isEpisodeUnlocked(episode)) return;
      setActiveEpisodeSlug(episode.slug);
      setSelection({});
      setResult(null);
      setSubmitError("");
      setReasonRevealed(false);
      setTransferChoice(null);
      setActiveSlot("top");
      setTimeLeft(episode.timeLimitSeconds);
      setTimerStarted(false);
      setCutsceneIndex(0);
      startedAtRef.current = 0;
      deadlineAtRef.current = 0;
      timeoutHandledRef.current = false;
      setStage(
        progress.seenChapterOpenings.includes(episode.chapterId)
          ? "episodeIntro"
          : "chapterIntro",
      );
    },
    [isEpisodeUnlocked, progress.seenChapterOpenings],
  );

  const beginDressing = () => {
    setSelection({});
    setResult(null);
    setSubmitError("");
    setReasonRevealed(false);
    setTransferChoice(null);
    setActiveSlot("top");
    setTimeLeft(activeEpisode.timeLimitSeconds);
    setTimerStarted(false);
    startedAtRef.current = 0;
    deadlineAtRef.current = 0;
    timeoutHandledRef.current = false;
    setStage("dress");
  };

  const retryDressing = () => {
    setResult(null);
    setSubmitError("");
    setReasonRevealed(false);
    setTransferChoice(null);
    setTimeLeft(activeEpisode.timeLimitSeconds);
    setTimerStarted(true);
    startedAtRef.current = nowInMilliseconds();
    deadlineAtRef.current =
      startedAtRef.current + activeEpisode.timeLimitSeconds * 1000;
    timeoutHandledRef.current = false;
    setStage("dress");
  };

  const submitOutfit = useCallback(
    async (timedOut = false) => {
      if (!isOutfitComplete && !timedOut) {
        setSubmitError("겉옷·하의·신발·소품을 모두 골라 주세요.");
        return;
      }

      if (submitLockRef.current || stage !== "dress") {
        return;
      }
      submitLockRef.current = true;
      setSubmitting(true);
      setSubmitError("");

      const measuredElapsed = startedAtRef.current
        ? Math.round((nowInMilliseconds() - startedAtRef.current) / 1000)
        : 0;
      const elapsedSeconds = timedOut
        ? activeEpisode.timeLimitSeconds
        : Math.min(
            activeEpisode.timeLimitSeconds,
            Math.max(0, measuredElapsed),
          );

      try {
        const response = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioSlug: activeEpisode.slug,
            selectedItemIds: Object.values(selection),
            elapsedSeconds,
          }),
        });
        if (!response.ok) throw new Error("score request failed");
        const scored = (await response.json()) as ScoreResult;
        if (scored.scenarioSlug !== activeEpisode.slug) {
          throw new Error("scenario mismatch");
        }

        setResult(scored);
        setProgress((current) => {
          const previous = current.episodes[activeEpisode.slug] ?? {
            completed: false,
            stars: 0,
            bestScore: 0,
          };
          const bestEpisodeScore = Math.max(previous.bestScore, scored.total);
          const bestStars = Math.max(previous.stars, scored.stars);
          return {
            ...current,
            version: 3,
            episodes: {
              ...current.episodes,
              [activeEpisode.slug]: {
                bestScore: bestEpisodeScore,
                stars: bestStars,
                completed:
                  previous.completed ||
                  (bestEpisodeScore >= 60 && bestStars >= 1),
              },
            },
          };
        });
        setStage("result");
      } catch {
        setSubmitError(
          "채점 연결이 잠시 불안정해요. 코디는 그대로 두었으니 다시 눌러 주세요.",
        );
      } finally {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    },
    [
      activeEpisode,
      isOutfitComplete,
      selection,
      stage,
    ],
  );

  useEffect(() => {
    if (stage !== "dress" || !timerStarted) return;
    const updateRemainingTime = () => {
      if (!deadlineAtRef.current) return;
      const remaining = getRemainingSeconds(
        deadlineAtRef.current,
        nowInMilliseconds(),
      );
      setTimeLeft(remaining);
      if (remaining === 0 && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        void submitOutfit(true);
      }
    };
    updateRemainingTime();
    const timer = window.setInterval(() => {
      updateRemainingTime();
    }, 250);
    return () => window.clearInterval(timer);
  }, [stage, submitOutfit, timerStarted]);

  const selectItem = (item: ClothingItem) => {
    if (
      deadlineAtRef.current > 0 &&
      nowInMilliseconds() >= deadlineAtRef.current
    ) {
      setTimeLeft(0);
      return;
    }
    if (!startedAtRef.current) {
      startedAtRef.current = nowInMilliseconds();
      deadlineAtRef.current =
        startedAtRef.current + activeEpisode.timeLimitSeconds * 1000;
      setTimerStarted(true);
    }
    setSelection((current) => ({ ...current, [item.slot]: item.id }));
  };

  const clearSelection = () => {
    if (
      deadlineAtRef.current > 0 &&
      nowInMilliseconds() >= deadlineAtRef.current
    ) {
      setTimeLeft(0);
      return;
    }
    setSelection({});
  };

  const goToModes = () => {
    setStage("modes");
    setLoginNotice("");
    setSubmitError("");
  };

  const rememberChapterOpening = () => {
    setProgress((current) => ({
      ...current,
      seenChapterOpenings: current.seenChapterOpenings.includes(
        activeChapter.id,
      )
        ? current.seenChapterOpenings
        : [...current.seenChapterOpenings, activeChapter.id],
    }));
  };

  const completeChapterIntro = () => {
    rememberChapterOpening();
    setCutsceneIndex(0);
    setStage("episodeIntro");
  };

  const completeEpisodeIntro = () => {
    setCutsceneIndex(0);
    setStage("messages");
  };

  const startChapterOutro = () => {
    setCutsceneIndex(0);
    setStage("chapterOutro");
  };

  const completeChapterOutro = () => {
    setProgress((current) => ({
      ...current,
      seenChapterEndings: current.seenChapterEndings.includes(activeChapter.id)
        ? current.seenChapterEndings
        : [...current.seenChapterEndings, activeChapter.id],
    }));
    setCutsceneIndex(0);
    if (nextEpisode) {
      openEpisode(nextEpisode);
    } else {
      setStage("story");
    }
  };

  const replayChapterOpening = (chapterId: string) => {
    const chapter = STORY_CHAPTERS.find((entry) => entry.id === chapterId);
    const episode = chapter
      ? getEpisode(chapter.episodeSlugs[0])
      : undefined;
    if (!episode || !isEpisodeUnlocked(episode)) return;
    setActiveEpisodeSlug(episode.slug);
    setSelection({});
    setResult(null);
    setSubmitError("");
    setReasonRevealed(false);
    setTransferChoice(null);
    setCutsceneIndex(0);
    setStage("chapterIntro");
  };

  const chapterOutroBeats = chapterNarrative
    ? activeChapter.id === "safety-call"
      ? [
          ...STORY_FINAL_ENDING.ending,
          ...STORY_FINAL_ENDING.nextSeasonHook.slice(-1),
        ]
      : [...chapterNarrative.ending, ...chapterNarrative.nextHook]
    : [];

  if (stage === "welcome") {
    return (
      <main className="welcome-screen">
        <div className="welcome-decor welcome-cloud-one" />
        <div className="welcome-decor welcome-cloud-two" />
        <div className="welcome-copy">
          <div className="welcome-logo">
            <LogoMark />
            <span>스타일 구조대</span>
          </div>
          <p className="eyebrow">문자 속 단서를 찾는 옷입히기 게임</p>
          <h1>
            오늘의 상황에
            <br />
            딱 맞는 옷은?
          </h1>
          <p className="welcome-lead">
            때·장소·상황을 읽고, 13개 임무의 동물 친구들에게 꼭 맞는 코디를 완성해 주세요.
          </p>
          <button
            className="primary-button welcome-button"
            onClick={() => setStage("login")}
          >
            구조대 입단하기 <span aria-hidden="true">→</span>
          </button>
          <p className="welcome-footnote">스토리 모드 · 총 13개 TPO 임무</p>
        </div>
        <div className="hero-stage">
          <div className="hero-message">
            <span>긴급 문자 도착!</span>
            <strong>“오늘은 어떤 옷이 알맞을까?”</strong>
          </div>
          <CharacterRenderer
            selectedItems={[]}
            mood="success"
            priority
            episodeSlug={firstEpisode.slug}
            characterName={getWearerName(firstEpisode)}
          />
          <div className="hero-tags" aria-hidden="true">
            <span>TIME</span>
            <span>PLACE</span>
            <span>OCCASION</span>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "login") {
    return (
      <main className="simple-screen login-screen">
        <button className="back-button" onClick={() => setStage("welcome")}>
          ← 처음으로
        </button>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="panel-brand">
            <LogoMark />
            <span>TPO 스타일 구조대</span>
          </div>
          <p className="eyebrow">오늘의 코디네이터</p>
          <h1 id="login-title">구조대에 입장해요</h1>
          <p className="panel-description">
            로그인 기능은 다음 단계에서 열립니다. 지금은 게스트로 임무를 체험해 보세요.
          </p>
          <label>
            이메일
            <input
              type="email"
              placeholder="student@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </label>
          <button
            className="secondary-button"
            onClick={() =>
              setLoginNotice(
                "로그인 기능은 준비 중이에요. 게스트로 먼저 만나봐요!",
              )
            }
          >
            로그인
          </button>
          {loginNotice && (
            <p className="inline-notice" role="status">
              {loginNotice}
            </p>
          )}
          <div className="divider">
            <span>또는</span>
          </div>
          <button className="primary-button" onClick={goToModes}>
            게스트로 시작
          </button>
          <small>입력한 이메일과 비밀번호는 저장하거나 전송하지 않습니다.</small>
        </section>
      </main>
    );
  }

  if (stage === "modes") {
    return (
      <main className="game-shell mode-screen">
        <AppHeader
          onHome={() => setStage("welcome")}
          bestScore={bestScore}
          homeLabel="처음 화면으로 이동"
          notice={storageWarning}
        />
        <section className="mode-content">
          <p className="eyebrow">SELECT MODE</p>
          <h1>어떤 임무를 시작할까요?</h1>
          <p className="section-lead">
            스토리 모드에서 13개의 TPO 상황을 차례대로 해결해 보세요.
          </p>
          <div className="mode-grid">
            <button
              className="mode-card story-card"
              onClick={() => setStage("story")}
            >
              <span className="mode-number">01</span>
              <div>
                <span className="mode-kicker">혼자 차근차근</span>
                <h2>스토리 모드</h2>
                <p>문자를 읽고 동물 친구들의 옷차림을 도와주세요.</p>
              </div>
              <span className="mode-arrow" aria-hidden="true">→</span>
            </button>
            <button className="mode-card battle-card" disabled>
              <span className="mode-number">02</span>
              <div>
                <span className="mode-kicker">COMING SOON</span>
                <h2>배틀 모드</h2>
                <p>같은 상황에서 누가 더 빠르고 알맞게 입힐까요?</p>
              </div>
              <span className="lock-badge" aria-hidden="true">잠김</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (
    stage === "chapterIntro" ||
    stage === "episodeIntro" ||
    stage === "chapterOutro"
  ) {
    const isChapterIntro = stage === "chapterIntro";
    const isEpisodeIntro = stage === "episodeIntro";
    const beats = isChapterIntro
      ? chapterNarrative?.opening ?? []
      : isEpisodeIntro
        ? episodeNarrative?.intro ?? []
        : chapterOutroBeats;
    const isLastBeat = cutsceneIndex >= beats.length - 1;
    const completeCutscene = isChapterIntro
      ? completeChapterIntro
      : isEpisodeIntro
        ? completeEpisodeIntro
        : completeChapterOutro;
    const cutsceneTitle = isChapterIntro
      ? activeChapter.title
      : isEpisodeIntro
        ? activeEpisode.title
        : activeChapter.id === "safety-call"
          ? STORY_FINAL_ENDING.title
          : `${chapterNarrative?.badgeName ?? "배지"} 획득`;
    const nextLabel = isChapterIntro
      ? "이 임무 만나기"
      : isEpisodeIntro
        ? "문자 확인하기"
        : nextEpisode
          ? "다음 챕터 열기"
          : "완성한 이야기 보기";
    const isNextChapterHook =
      stage === "chapterOutro" &&
      Boolean(nextEpisode) &&
      cutsceneIndex >= (chapterNarrative?.ending.length ?? 0);
    const cutsceneEpisodeSlug = getCutsceneVisualEpisodeSlug({
      stage,
      activeEpisodeSlug: activeEpisode.slug,
      protagonistEpisodeSlug: firstEpisode.slug,
      nextEpisodeSlug: nextEpisode?.slug,
      isNextChapterHook,
    });
    const cutsceneEpisode =
      getEpisode(cutsceneEpisodeSlug) ?? firstEpisode;
    const cutsceneWearerName = getWearerName(cutsceneEpisode);

    return (
      <main className="game-shell cutscene-screen">
        <AppHeader
          onHome={() => setStage("story")}
          bestScore={bestScore}
          homeLabel="스토리 맵으로 이동"
          notice={storageWarning}
        />
        <StoryCutscene
          eyebrow={
            isChapterIntro
              ? STORY_NARRATIVE_TITLE
              : isEpisodeIntro
                ? `EPISODE ${String(activeEpisode.order).padStart(2, "0")}`
                : "CHAPTER COMPLETE"
          }
          title={cutsceneTitle}
          beats={beats}
          activeIndex={cutsceneIndex}
          backgroundImage={getEpisodeBackground(cutsceneEpisode.slug)}
          accent={activeChapter.color}
          episodeSlug={cutsceneEpisode.slug}
          characterName={cutsceneWearerName}
          badgeName={
            isChapterIntro || stage === "chapterOutro"
              ? chapterNarrative?.badgeName
              : undefined
          }
          nextLabel={nextLabel}
          onBack={() => {
            if (cutsceneIndex > 0) {
              setCutsceneIndex((current) => current - 1);
            } else {
              setStage(stage === "chapterOutro" ? "result" : "story");
            }
          }}
          onNext={() => {
            if (isLastBeat) {
              completeCutscene();
            } else {
              setCutsceneIndex((current) => current + 1);
            }
          }}
          onSkip={
            stage === "chapterOutro" ? undefined : completeCutscene
          }
        />
      </main>
    );
  }

  if (stage === "story") {
    return (
      <main className="game-shell story-screen">
        <AppHeader
          onHome={goToModes}
          bestScore={bestScore}
          notice={storageWarning}
        />
        <section className="story-content">
          <div className="story-heading">
            <div>
              <p className="eyebrow">STORY MAP · {completedCount} / 13</p>
              <h1>TPO 구조대 이야기</h1>
              <p>앞 임무에서 60점과 별 1개를 받으면 다음 임무가 열려요.</p>
            </div>
            <div className="story-progress-summary">
              <strong>{completedCount}개 완료</strong>
              <progress
                className="chapter-progress"
                value={completedCount}
                max={STORY_EPISODES.length}
                aria-label={`전체 ${STORY_EPISODES.length}개 중 ${completedCount}개 완료`}
              />
            </div>
          </div>
          <div className="story-chapters">
            {STORY_CHAPTERS.map((chapter) => {
              const chapterEpisodes = chapter.episodeSlugs.flatMap((slug) => {
                const episode = getEpisode(slug);
                return episode ? [episode] : [];
              });
              return (
                <section
                  className="story-chapter"
                  style={getChapterStyle(chapter.color)}
                  aria-labelledby={`chapter-${chapter.id}`}
                  key={chapter.id}
                >
                  <div className="chapter-heading-row">
                    <div>
                      <small>CHAPTER</small>
                      <h2 id={`chapter-${chapter.id}`}>{chapter.title}</h2>
                    </div>
                    <div className="chapter-heading-actions">
                      <p>{chapter.subtitle}</p>
                      <button
                        className="chapter-story-button"
                        onClick={() => replayChapterOpening(chapter.id)}
                        disabled={
                          !chapterEpisodes[0] ||
                          !isEpisodeUnlocked(chapterEpisodes[0])
                        }
                      >
                        이야기 다시 보기
                      </button>
                    </div>
                  </div>
                  <div className="episode-list">
                    {chapterEpisodes.map((episode) => {
                      const unlocked = isEpisodeUnlocked(episode);
                      const entry = progress.episodes[episode.slug];
                      const previous = STORY_EPISODES[episode.order - 2];
                      return (
                        <button
                          className={[
                            "episode-card",
                            unlocked ? "episode-active" : "episode-locked",
                            entry?.completed ? "episode-complete" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => openEpisode(episode)}
                          disabled={!unlocked}
                          aria-label={
                            unlocked
                              ? `${episode.order}화 ${episode.title}, ${
                                  entry?.completed ? "완료" : "도전 가능"
                                }`
                              : `${episode.order}화 ${episode.title}, 잠김`
                          }
                          key={episode.slug}
                        >
                          <span className="episode-index">
                            {String(episode.order).padStart(2, "0")}
                          </span>
                          <div>
                            <small>
                              {entry?.completed
                                ? "임무 완료"
                                : unlocked
                                  ? "도전 가능"
                                  : `${previous?.title ?? "앞 임무"} 완료 후 열림`}
                            </small>
                            <h2>
                              <span aria-hidden="true">{episode.weatherIcon} </span>
                              {episode.title}
                            </h2>
                            <span className="episode-character-chip">
                              {getWearerName(episode)}에게 입혀요
                            </span>
                            <p>{episode.teaser}</p>
                          </div>
                          {unlocked ? (
                            <div className="episode-score">
                              <EpisodeStars stars={entry?.stars ?? 0} />
                              <span>
                                {entry?.bestScore
                                  ? `BEST ${entry.bestScore}점`
                                  : "첫 도전"}
                              </span>
                              <strong>시작 →</strong>
                            </div>
                          ) : (
                            <span className="episode-lock">잠김</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (stage === "messages") {
    return (
      <main className="game-shell message-screen">
        <AppHeader
          onHome={() => setStage("story")}
          bestScore={bestScore}
          homeLabel="스토리 맵으로 이동"
          notice={storageWarning}
        />
        <section className="message-layout">
          <div className="mission-copy">
            <p className="eyebrow">{activeEpisode.kicker}</p>
            <h1>{activeEpisode.title}</h1>
            <p>{episodeNarrative?.cause ?? activeEpisode.teaser}</p>
            <p className="mission-read-note">
              문자에서 T·P·O 단서를 찾아보세요. 아직 시간은 흐르지 않아요.
            </p>
            <div className="tpo-clues">
              <div><span>T</span><strong>{activeEpisode.tpo.time}</strong></div>
              <div><span>P</span><strong>{activeEpisode.tpo.place}</strong></div>
              <div><span>O</span><strong>{activeEpisode.tpo.occasion}</strong></div>
            </div>
          </div>
          <div
            className="phone-frame"
            aria-label={getConversationLabel(activeEpisode.sender)}
          >
            <div className="phone-top">
              <button
                onClick={() => setStage("story")}
                aria-label="스토리 맵으로 돌아가기"
              >
                ←
              </button>
              <div className="contact">
                <span className="contact-avatar">
                  {activeEpisode.sender.slice(0, 1)}
                </span>
                <div>
                  <strong>{activeEpisode.sender}</strong>
                  <small>지금 접속 중</small>
                </div>
              </div>
              <span className="signal-dots" aria-hidden="true">•••</span>
            </div>
            <div className="chat-body">
              <div className="chat-time">{activeEpisode.tpo.time}</div>
              {activeEpisode.messages.map((message, index) => (
                <div
                  className={`chat-row ${
                    message.speaker === "구조대" ? "chat-me" : ""
                  }`}
                  key={`${message.speaker}-${message.text}`}
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <span className="chat-bubble">{message.text}</span>
                </div>
              ))}
            </div>
            <div className="phone-action">
              <button className="primary-button" onClick={beginDressing}>
                옷장 열기 · 첫 선택부터 {activeEpisode.timeLimitSeconds}초
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (stage === "dress") {
    const percentage =
      (timeLeft / activeEpisode.timeLimitSeconds) * 100;
    const availableItems = getItemsForEpisodeSlot(activeEpisode, activeSlot);

    return (
      <main className="game-shell dress-screen">
        <header className="dress-header">
          <button
            className="back-button compact"
            onClick={() => setStage("messages")}
            disabled={submitting}
            aria-label="현재 도전을 끝내고 문자 다시 보기"
          >
            ← 도전 끝내기
          </button>
          <div className="mission-title">
            <small>{wearerName}에게 입히는 중</small>
            <strong>{activeEpisode.title}</strong>
          </div>
          <div
            className={`timer ${timeLeft <= 10 ? "timer-danger" : ""}`}
            role="timer"
            aria-live={timeLeft <= 10 ? "polite" : "off"}
            aria-label={
              hasTimedOut ? "제한 시간 종료" : `남은 시간 ${timeLeft}초`
            }
          >
            <div
              className="timer-ring"
              style={{ "--progress": `${percentage}%` } as CSSProperties}
            >
              <strong>{timeLeft}</strong>
            </div>
            <span>초</span>
          </div>
        </header>
        <section className="dress-layout">
          <div
            className={`avatar-panel ${
              activeEpisode.slug === "rescue-team-trial"
                ? "avatar-panel--art-slice"
                : ""
            }`}
            style={getAvatarStyle(activeEpisode)}
          >
            <div className="weather-strip">
              <span className="weather-icon" aria-hidden="true">
                {activeEpisode.weatherIcon}
              </span>
              <div>
                <strong>{activeEpisode.weatherLabel}</strong>
                <small>{activeEpisode.weatherNote}</small>
              </div>
            </div>
            <div className="avatar-stage">
              <CharacterRenderer
                selectedItems={selectedItems}
                mood="ready"
                priority
                episodeSlug={activeEpisode.slug}
                characterName={wearerName}
              />
              <div className="selected-summary">
                {slots.map((slot) => {
                  const item = selectedItems.find(
                    (selected) => selected.slot === slot,
                  );
                  return (
                    <div key={slot} className={item ? "slot-filled" : ""}>
                      <span>{SLOT_LABELS[slot]}</span>
                      <strong>{item?.name ?? "고르기"}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="wardrobe-panel">
            <div className="wardrobe-heading">
              <div>
                <p className="eyebrow">WARDROBE</p>
                <h2>{wearerName}의 옷장을 열어요</h2>
              </div>
              <button
                className="text-button"
                onClick={clearSelection}
                disabled={submitting || hasTimedOut}
              >
                모두 벗기
              </button>
            </div>
            <div className="mobile-outfit-preview">
              <CharacterRenderer
                selectedItems={selectedItems}
                mood="ready"
                episodeSlug={activeEpisode.slug}
                characterName={wearerName}
              />
              <div className="mobile-outfit-preview-copy">
                <span>현재 코디</span>
                <strong>{selectedItems.length} / {slots.length}</strong>
                <small>
                  {isOutfitComplete
                    ? "준비 완료! 코디를 확인해 보세요."
                    : `${slots.length - selectedItems.length}개를 더 골라 주세요.`}
                </small>
              </div>
            </div>
            <div className="slot-tabs" role="group" aria-label="옷 종류">
              {slots.map((slot) => (
                <button
                  key={slot}
                  aria-pressed={activeSlot === slot}
                  className={activeSlot === slot ? "active" : ""}
                  onClick={() => setActiveSlot(slot)}
                >
                  {SLOT_LABELS[slot]}
                  {selection[slot] && <span aria-label="선택 완료">✓</span>}
                </button>
              ))}
            </div>
            <div className="item-grid">
              {availableItems.map((item) => {
                const isSelected = selection[item.slot] === item.id;
                return (
                  <button
                    key={item.id}
                    className={`item-card ${
                      isSelected ? "item-selected" : ""
                    }`}
                    onClick={() => selectItem(item)}
                    disabled={submitting || hasTimedOut}
                    aria-pressed={isSelected}
                  >
                    <span
                      className="item-visual"
                      style={
                        {
                          "--swatch": item.color,
                          "--swatch-accent": item.accent,
                        } as CSSProperties
                      }
                    >
                      <ItemThumbnail
                        item={item}
                        episodeSlug={activeEpisode.slug}
                      />
                    </span>
                    <strong>{item.name}</strong>
                    <small>{item.note}</small>
                    <span className="select-label">
                      {isSelected ? "입는 중" : "입어 보기"}
                    </span>
                  </button>
                );
              })}
            </div>
            {submitError && (
              <p className="submit-error" role="alert">
                {submitError}
              </p>
            )}
            <div className="submit-bar">
              <div>
                <span>선택한 아이템</span>
                <strong>{selectedItems.length} / 4</strong>
              </div>
              <button
                className="primary-button"
                onClick={() => void submitOutfit(hasTimedOut)}
                disabled={
                  submitting || (!isOutfitComplete && !hasTimedOut)
                }
                aria-busy={submitting}
              >
                {submitting
                  ? "채점하는 중…"
                  : hasTimedOut
                    ? "시간 종료 · 결과 확인"
                  : isOutfitComplete
                    ? "이 코디로 출발!"
                    : `${slots.length - selectedItems.length}개 더 골라요`}
                {!submitting && (isOutfitComplete || hasTimedOut) && (
                  <span aria-hidden="true">→</span>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const passed = Boolean(result && result.total >= 60 && result.stars >= 1);
  const isChapterFinale =
    activeChapter.episodeSlugs.at(-1) === activeEpisode.slug;
  return (
    <main className="game-shell result-screen">
      <AppHeader
        onHome={goToModes}
        bestScore={bestScore}
        notice={storageWarning}
      />
      {result && (
        <section className="result-layout">
          <div className="result-hero">
            <p className="eyebrow">
              {passed ? "MISSION COMPLETE" : "MISSION RETRY"}
            </p>
            <h1>
              {passed ? activeEpisode.successTitle : activeEpisode.retryTitle}
            </h1>
            <p>
              {passed
                ? "선택한 옷이 친구의 하루를 어떻게 바꿨는지 확인해 봐요."
                : episodeNarrative?.retryLine ??
                  "빠뜨린 단서를 확인하고 다시 코디하면 더 좋아질 거예요."}
            </p>
            {!passed && (
              <button
                className="secondary-button result-quick-retry"
                onClick={retryDressing}
              >
                다시 코디하기 <span aria-hidden="true">↻</span>
              </button>
            )}
            <div className="result-character-wrap">
              <CharacterRenderer
                selectedItems={selectedItems}
                mood={passed ? "success" : "retry"}
                priority
                episodeSlug={activeEpisode.slug}
                characterName={wearerName}
              />
            </div>
            <div className="score-orbit">
              <span>총점</span>
              <strong>{result.total}</strong>
              <small>/ 100</small>
            </div>
            <StarRating stars={result.stars} />
          </div>
          <div className="result-details">
            <div className="result-card score-card">
              <div className="result-card-heading">
                <div>
                  <p className="eyebrow">SCORE REPORT</p>
                  <h2>점수는 이렇게 만들어졌어요</h2>
                </div>
                <span className="best-pill">
                  EPISODE BEST {activeProgress?.bestScore ?? result.total}
                </span>
              </div>
              <div className="score-list">
                {SCORE_LABELS.map(([key, label, max]) => (
                  <div className="score-line" key={key}>
                    <div>
                      <span>{label}</span>
                      <strong>
                        {result.breakdown[key]}
                        <small> / {max}</small>
                      </strong>
                    </div>
                    <div className="score-track">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            (result.breakdown[key] / max) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="feedback-grid">
              <div className="result-card feedback-good">
                <span className="feedback-index">GOOD</span>
                <h3>잘 찾은 단서</h3>
                <ul>
                  {(result.strengths.length
                    ? result.strengths.slice(0, 5)
                    : ["선택한 코디를 다시 보면 좋은 단서를 찾을 수 있어요."]
                  ).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="result-card feedback-next">
                <span className="feedback-index">NEXT</span>
                <h3>다음에 더 챙길 점</h3>
                <ul>
                  {(result.improvements.length
                    ? result.improvements.slice(0, 5)
                    : ["안전·활동·예절을 모두 갖춘 멋진 코디예요!"]
                  ).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
            <div className="tpo-answer">
              <span>T</span><strong>{activeEpisode.tpo.time}</strong>
              <span>P</span><strong>{activeEpisode.tpo.place}</strong>
              <span>O</span><strong>{activeEpisode.tpo.occasion}</strong>
            </div>
            {episodeNarrative && (
              <section
                className={`story-aftermath ${
                  passed ? "" : "story-aftermath-retry"
                }`}
                aria-labelledby="story-aftermath-title"
              >
                <span className="feedback-index">
                  {passed ? "AFTER STORY" : "STILL AT HQ"}
                </span>
                <h3 id="story-aftermath-title">
                  {passed
                    ? `${wearerName}의 임무 후 이야기`
                    : "아직 출발 전이에요"}
                </h3>
                {passed ? (
                  <>
                    {episodeNarrative.successAftermath.map((beat) => (
                      <p key={beat.id}>{beat.text}</p>
                    ))}
                    {!isChapterFinale &&
                      episodeNarrative.nextHook.map((beat) => (
                        <p className="story-next-hook" key={beat.id}>
                          다음 이야기 · {beat.text}
                        </p>
                      ))}
                  </>
                ) : (
                  <p>{episodeNarrative.retryLine}</p>
                )}
              </section>
            )}
            {episodeLearning && (
              <section className="learning-check" aria-labelledby="learning-title">
                <div className="learning-reason">
                  <span className="feedback-index">WHY TPO?</span>
                  <h3 id="learning-title">{episodeLearning.reasonPrompt}</h3>
                  <p>아래 단서를 사용해 먼저 소리 내어 설명해 보세요.</p>
                  <div className="reason-clues">
                    {episodeLearning.reasonClues.map((clue) => (
                      <span key={clue}>{clue}</span>
                    ))}
                  </div>
                  <button
                    className="reason-reveal-button"
                    onClick={() => setReasonRevealed((current) => !current)}
                    aria-expanded={reasonRevealed}
                  >
                    {reasonRevealed ? "예시 설명 닫기" : "예시 설명 확인하기"}
                  </button>
                  {reasonRevealed && (
                    <p className="model-answer">{episodeLearning.modelAnswer}</p>
                  )}
                </div>
                <div className="transfer-check">
                  <span className="feedback-index">NEW TPO</span>
                  <h3>{episodeLearning.transfer.situation}</h3>
                  <p>{episodeLearning.transfer.question}</p>
                  <div
                    className="transfer-options"
                    role="group"
                    aria-label="새 상황에 필요한 기능 선택"
                  >
                    {episodeLearning.transfer.options.map((option) => (
                      <button
                        key={option.id}
                        className={
                          transferChoice === option.id
                            ? option.id ===
                              episodeLearning.transfer.correctOptionId
                              ? "transfer-correct"
                              : "transfer-wrong"
                            : ""
                        }
                        onClick={() => setTransferChoice(option.id)}
                        aria-pressed={transferChoice === option.id}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {transferChoice && (
                    <p
                      className={`transfer-feedback ${
                        transferPassed ? "transfer-feedback-correct" : ""
                      }`}
                      role="status"
                    >
                      {transferPassed
                        ? episodeLearning.transfer.successFeedback
                        : episodeLearning.transfer.retryFeedback}
                    </p>
                  )}
                </div>
              </section>
            )}
            <div className="result-actions">
              {passed && (
                <button className="secondary-button" onClick={retryDressing}>
                  다시 코디하기
                </button>
              )}
              <button
                className="secondary-button"
                onClick={() => setStage("story")}
              >
                스토리 맵
              </button>
              {passed && isChapterFinale ? (
                <button
                  className="primary-button"
                  onClick={startChapterOutro}
                  disabled={!transferPassed}
                >
                  {transferPassed
                    ? nextEpisode
                      ? "챕터 마무리 보기"
                      : "최종 엔딩 보기"
                    : "새 상황을 먼저 풀어 주세요"}
                  <span aria-hidden="true">→</span>
                </button>
              ) : passed && nextEpisode ? (
                <button
                  className="primary-button"
                  onClick={() => openEpisode(nextEpisode)}
                  disabled={!transferPassed}
                >
                  {transferPassed ? "다음 임무" : "새 상황을 먼저 풀어 주세요"}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => setStage("story")}
                >
                  {passed ? "이야기 완료" : "맵에서 다시 고르기"}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
