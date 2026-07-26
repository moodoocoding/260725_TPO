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
import { getEpisodeBackground } from "@/lib/art-manifest";
import type { ScoreResult } from "@/lib/scoring";
import { getEpisodeLearning } from "@/lib/tpo-learning";
import {
  SLOT_LABELS,
  STORY_CHAPTERS,
  STORY_EPISODES,
  STORY_SLOTS,
  getEpisode,
  getItemsForEpisode,
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
  | "messages"
  | "dress"
  | "result";

type Selection = Partial<Record<Slot, string>>;
type EpisodeProgress = {
  completed: boolean;
  stars: number;
  bestScore: number;
};
type StoryProgress = {
  version: 2;
  episodes: Record<string, EpisodeProgress>;
};

const PROGRESS_KEY = "tpo-story-progress-v2";
const EMPTY_PROGRESS: StoryProgress = { version: 2, episodes: {} };
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

function parseProgress(raw: string | null): StoryProgress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as Partial<StoryProgress>;
    if (parsed.version !== 2 || typeof parsed.episodes !== "object") {
      return EMPTY_PROGRESS;
    }

    const episodes: Record<string, EpisodeProgress> = {};
    for (const episode of STORY_EPISODES) {
      const value = parsed.episodes?.[episode.slug];
      if (!value || typeof value !== "object") continue;
      const score = Number(value.bestScore);
      const stars = Number(value.stars);
      if (!Number.isFinite(score) || !Number.isFinite(stars)) continue;
      const bestScore = Math.max(0, Math.min(100, Math.round(score)));
      const safeStars = Math.max(0, Math.min(3, Math.round(stars)));
      episodes[episode.slug] = {
        bestScore,
        stars: safeStars,
        completed: bestScore >= 60 && safeStars >= 1,
      };
    }
    return { version: 2, episodes };
  } catch {
    return EMPTY_PROGRESS;
  }
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
}: {
  onHome: () => void;
  bestScore: number;
  homeLabel?: string;
}) {
  return (
    <header className="app-header">
      <button className="brand-button" onClick={onHome} aria-label={homeLabel}>
        <LogoMark />
        <span>스타일 구조대</span>
      </button>
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

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [activeEpisodeSlug, setActiveEpisodeSlug] = useState(firstEpisode.slug);
  const [activeSlot, setActiveSlot] = useState<Slot>("top");
  const [selection, setSelection] = useState<Selection>({});
  const [timeLeft, setTimeLeft] = useState(firstEpisode.timeLimitSeconds);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [progress, setProgress] = useState<StoryProgress>(EMPTY_PROGRESS);
  const [legacyBestScore, setLegacyBestScore] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [reasonRevealed, setReasonRevealed] = useState(false);
  const [transferChoice, setTransferChoice] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  const deadlineAtRef = useRef(0);
  const submitLockRef = useRef(false);

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
  const transferPassed =
    !episodeLearning ||
    transferChoice === episodeLearning.transfer.correctOptionId;

  useEffect(() => {
    const syncStoredProgress = window.setTimeout(() => {
      setProgress(parseProgress(window.localStorage.getItem(PROGRESS_KEY)));
      const oldBest = Number(
        window.localStorage.getItem("tpo-best-score") || 0,
      );
      if (Number.isFinite(oldBest)) setLegacyBestScore(oldBest);
      setProgressLoaded(true);
    }, 0);
    return () => window.clearTimeout(syncStoredProgress);
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    window.localStorage.setItem("tpo-best-score", String(bestScore));
  }, [bestScore, progress, progressLoaded]);

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
      startedAtRef.current = 0;
      deadlineAtRef.current = 0;
      setStage("messages");
    },
    [isEpisodeUnlocked],
  );

  const beginDressing = () => {
    setSelection({});
    setResult(null);
    setSubmitError("");
    setReasonRevealed(false);
    setTransferChoice(null);
    setActiveSlot("top");
    setTimeLeft(activeEpisode.timeLimitSeconds);
    startedAtRef.current = Date.now();
    deadlineAtRef.current =
      startedAtRef.current + activeEpisode.timeLimitSeconds * 1000;
    setStage("dress");
  };

  const submitOutfit = useCallback(
    async (timedOut = false) => {
      if (
        submitLockRef.current ||
        submitting ||
        stage !== "dress"
      ) {
        return;
      }
      submitLockRef.current = true;
      setSubmitting(true);
      setSubmitError("");

      const measuredElapsed = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : activeEpisode.timeLimitSeconds - timeLeft;
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
            version: 2,
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
      selection,
      stage,
      submitting,
      timeLeft,
    ],
  );

  useEffect(() => {
    if (stage !== "dress") return;
    const updateRemainingTime = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineAtRef.current - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };
    updateRemainingTime();
    const timer = window.setInterval(() => {
      updateRemainingTime();
    }, 250);
    return () => window.clearInterval(timer);
  }, [stage]);

  const selectItem = (item: ClothingItem) => {
    setSelection((current) => ({ ...current, [item.slot]: item.id }));
  };

  const goToModes = () => {
    setStage("modes");
    setLoginNotice("");
    setSubmitError("");
  };

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
            때·장소·상황을 읽고, 13개의 임무에서 하루의 코디를 완성해 주세요.
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
                <p>문자를 읽고 하루의 옷차림을 도와주세요.</p>
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

  if (stage === "story") {
    return (
      <main className="game-shell story-screen">
        <AppHeader onHome={goToModes} bestScore={bestScore} />
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
                    <p>{chapter.subtitle}</p>
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
        />
        <section className="message-layout">
          <div className="mission-copy">
            <p className="eyebrow">{activeEpisode.kicker}</p>
            <h1>{activeEpisode.title}</h1>
            <p>문자에서 T·P·O 단서를 찾아보세요. 아직 시간은 흐르지 않아요.</p>
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
                {activeEpisode.timeLimitSeconds}초 옷입히기 시작
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
    const availableItems = episodeItems.filter(
      (item) => item.slot === activeSlot,
    );

    return (
      <main className="game-shell dress-screen">
        <header className="dress-header">
          <button
            className="back-button compact"
            onClick={() => setStage("messages")}
            aria-label="현재 도전을 끝내고 문자 다시 보기"
          >
            ← 도전 끝내기
          </button>
          <div className="mission-title">
            <small>{activeEpisode.kicker}</small>
            <strong>{activeEpisode.title}</strong>
          </div>
          <div className={`timer ${timeLeft <= 10 ? "timer-danger" : ""}`}>
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
                <h2>옷장을 열어 코디해요</h2>
              </div>
              <button className="text-button" onClick={() => setSelection({})}>
                모두 벗기
              </button>
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
                onClick={() => void submitOutfit(false)}
                disabled={submitting}
              >
                {submitting ? "채점하는 중…" : "이 코디로 출발!"}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const passed = Boolean(result && result.total >= 60 && result.stars >= 1);
  return (
    <main className="game-shell result-screen">
      <AppHeader onHome={goToModes} bestScore={bestScore} />
      {result && (
        <section className="result-layout">
          <div className="result-hero">
            <p className="eyebrow">MISSION COMPLETE</p>
            <h1>
              {passed ? activeEpisode.successTitle : activeEpisode.retryTitle}
            </h1>
            <p>
              {passed
                ? "상황의 단서를 잘 읽었어요. 다음 임무가 열렸는지 확인해 봐요."
                : "빠뜨린 단서를 확인하고 다시 코디하면 더 좋아질 거예요."}
            </p>
            <div className="result-character-wrap">
              <CharacterRenderer
                selectedItems={selectedItems}
                mood={passed ? "success" : "retry"}
                priority
                episodeSlug={activeEpisode.slug}
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
              <button className="secondary-button" onClick={beginDressing}>
                다시 코디하기
              </button>
              <button
                className="secondary-button"
                onClick={() => setStage("story")}
              >
                스토리 맵
              </button>
              {passed && nextEpisode ? (
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
                  {passed ? "모든 임무 완료!" : "맵에서 다시 고르기"}
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
