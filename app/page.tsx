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
  CLOTHING_ITEMS,
  SCENARIO,
  SLOT_LABELS,
  type ClothingItem,
  type Slot,
} from "@/lib/game-data";
import type { ScoreResult } from "@/lib/scoring";

type Stage =
  | "welcome"
  | "login"
  | "modes"
  | "story"
  | "messages"
  | "dress"
  | "result";

type Selection = Partial<Record<Slot, string>>;

const slots = Object.keys(SLOT_LABELS) as Slot[];
const SCORE_LABELS: Array<[keyof ScoreResult["breakdown"], string, number]> = [
  ["tpo", "TPO 적합성", 30],
  ["function", "보호·안전", 30],
  ["expression", "예절·표현", 20],
  ["completeness", "코디 완성도", 10],
  ["time", "시간 보너스", 10],
];

function getGuestId() {
  const existing = window.localStorage.getItem("tpo-guest-id");
  if (existing) return existing;
  const created =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem("tpo-guest-id", created);
  return created;
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
}: {
  onHome: () => void;
  bestScore: number;
}) {
  return (
    <header className="app-header">
      <button className="brand-button" onClick={onHome} aria-label="모드 선택으로 이동">
        <LogoMark />
        <span>스타일 구조대</span>
      </button>
      <div className="header-score" aria-label={`기기 최고 점수 ${bestScore}점`}>
        <span aria-hidden="true">★</span>
        <strong>{bestScore}</strong>
        <small>BEST</small>
      </div>
    </header>
  );
}

function Character({
  selectedItems,
  mood = "ready",
}: {
  selectedItems: ClothingItem[];
  mood?: "ready" | "happy" | "thinking";
}) {
  const bySlot = new Map(selectedItems.map((item) => [item.slot, item]));
  const top = bySlot.get("top");
  const bottom = bySlot.get("bottom");
  const shoes = bySlot.get("shoes");
  const accessory = bySlot.get("accessory");
  const itemStyle = (item?: ClothingItem) =>
    item
      ? ({
          "--item-color": item.color,
          "--item-accent": item.accent,
        } as CSSProperties)
      : undefined;

  return (
    <div className={`character character-${mood}`} aria-label="코디 중인 하루 캐릭터">
      <div className="character-shadow" />
      {accessory?.id.includes("umbrella") && (
        <div
          className={`umbrella ${
            accessory.id === "clear-umbrella" ? "umbrella-clear" : ""
          }`}
          style={itemStyle(accessory)}
          aria-hidden="true"
        >
          <span className="umbrella-canopy" />
          <span className="umbrella-stick" />
        </div>
      )}
      <div className="character-head">
        <span className="character-hair hair-left" />
        <span className="character-hair hair-right" />
        <span className="ear ear-left" />
        <span className="ear ear-right" />
        <span className="eye eye-left" />
        <span className="eye eye-right" />
        <span className="nose" />
        <span className="mouth" />
        <span className="cheek cheek-left" />
        <span className="cheek cheek-right" />
        {top?.id === "yellow-raincoat" && <span className="rain-hood" />}
      </div>
      <div className="character-neck" />
      <div
        className={`character-top ${top ? "has-item" : ""} ${
          top?.id ?? "base-top"
        }`}
        style={itemStyle(top)}
      >
        <span className="top-collar" />
        <span className="top-zip" />
        <span className="top-pocket pocket-left" />
        <span className="top-pocket pocket-right" />
      </div>
      <span
        className={`arm arm-left ${top ? "has-item" : ""}`}
        style={itemStyle(top)}
      />
      <span
        className={`arm arm-right ${top ? "has-item" : ""}`}
        style={itemStyle(top)}
      />
      <div
        className={`character-bottom ${bottom ? "has-item" : ""} ${
          bottom?.id ?? "base-bottom"
        }`}
        style={itemStyle(bottom)}
      >
        <span className="leg leg-left" />
        <span className="leg leg-right" />
      </div>
      <span
        className={`shoe shoe-left ${shoes?.id ?? "base-shoe"}`}
        style={itemStyle(shoes)}
      />
      <span
        className={`shoe shoe-right ${shoes?.id ?? "base-shoe"}`}
        style={itemStyle(shoes)}
      />
      {accessory?.id === "reflective-band" && (
        <span
          className="reflective-band"
          style={itemStyle(accessory)}
          aria-hidden="true"
        />
      )}
      {accessory?.id === "canvas-tote" && (
        <span
          className="tote-bag"
          style={itemStyle(accessory)}
          aria-hidden="true"
        />
      )}
    </div>
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

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [activeSlot, setActiveSlot] = useState<Slot>("top");
  const [selection, setSelection] = useState<Selection>({});
  const [timeLeft, setTimeLeft] = useState(SCENARIO.timeLimitSeconds);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [bestScore, setBestScore] = useState(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("tpo-best-score") || 0);
    if (!Number.isFinite(stored)) return;
    const syncStoredScore = window.setTimeout(() => setBestScore(stored), 0);
    return () => window.clearTimeout(syncStoredScore);
  }, []);

  const selectedItems = useMemo(
    () =>
      slots
        .map((slot) =>
          CLOTHING_ITEMS.find((item) => item.id === selection[slot]),
        )
        .filter((item): item is ClothingItem => Boolean(item)),
    [selection],
  );

  const beginDressing = () => {
    setSelection({});
    setResult(null);
    setSubmitError("");
    setTimeLeft(SCENARIO.timeLimitSeconds);
    startedAtRef.current = Date.now();
    setStage("dress");
  };

  const submitOutfit = useCallback(
    async (timedOut = false) => {
      if (submitting || stage !== "dress") return;
      setSubmitting(true);
      setSubmitError("");

      const measuredElapsed = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : SCENARIO.timeLimitSeconds - timeLeft;
      const elapsedSeconds = timedOut
        ? SCENARIO.timeLimitSeconds
        : Math.min(SCENARIO.timeLimitSeconds, Math.max(0, measuredElapsed));

      try {
        const response = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedItemIds: Object.values(selection),
            elapsedSeconds,
            guestId: getGuestId(),
          }),
        });

        if (!response.ok) throw new Error("score request failed");
        const scored = (await response.json()) as ScoreResult;
        setResult(scored);
        setBestScore((current) => {
          const next = Math.max(current, scored.total);
          window.localStorage.setItem("tpo-best-score", String(next));
          return next;
        });
        setStage("result");
      } catch {
        setSubmitError("채점 연결이 잠시 불안정해요. 코디는 그대로 두었으니 다시 눌러 주세요.");
      } finally {
        setSubmitting(false);
      }
    },
    [selection, stage, submitting, timeLeft],
  );

  useEffect(() => {
    if (stage !== "dress") return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "dress" || timeLeft !== 0 || submitting) return;
    const autoSubmit = window.setTimeout(() => void submitOutfit(true), 0);
    return () => window.clearTimeout(autoSubmit);
  }, [stage, submitOutfit, submitting, timeLeft]);

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
            때·장소·상황을 읽고, 제한 시간 안에 하루의 코디를 완성해 주세요.
          </p>
          <button className="primary-button welcome-button" onClick={() => setStage("login")}>
            구조대 입단하기
            <span aria-hidden="true">→</span>
          </button>
          <p className="welcome-footnote">스토리 모드 · 첫 번째 임무 체험판</p>
        </div>
        <div className="hero-stage">
          <div className="hero-message">
            <span>긴급 문자 도착!</span>
            <strong>“비 오는 저녁에 뭘 입지?”</strong>
          </div>
          <Character selectedItems={[]} mood="happy" />
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
            로그인 기능은 다음 단계에서 열립니다. 지금은 게스트로 첫 임무를 체험해 보세요.
          </p>
          <label>
            이메일
            <input type="email" placeholder="student@example.com" autoComplete="email" />
          </label>
          <label>
            비밀번호
            <input type="password" placeholder="비밀번호" autoComplete="current-password" />
          </label>
          <button
            className="secondary-button"
            onClick={() => setLoginNotice("로그인 기능은 준비 중이에요. 게스트로 먼저 만나봐요!")}
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
        <AppHeader onHome={() => setStage("welcome")} bestScore={bestScore} />
        <section className="mode-content">
          <p className="eyebrow">SELECT MODE</p>
          <h1>어떤 임무를 시작할까요?</h1>
          <p className="section-lead">오늘은 스토리 모드의 첫 번째 플레이를 준비했어요.</p>
          <div className="mode-grid">
            <button className="mode-card story-card" onClick={() => setStage("story")}>
              <span className="mode-number">01</span>
              <div>
                <span className="mode-kicker">혼자 차근차근</span>
                <h2>스토리 모드</h2>
                <p>문자를 읽고 하루의 옷차림을 도와주세요.</p>
              </div>
              <span className="mode-arrow" aria-hidden="true">
                →
              </span>
            </button>
            <button className="mode-card battle-card" disabled>
              <span className="mode-number">02</span>
              <div>
                <span className="mode-kicker">COMING SOON</span>
                <h2>배틀 모드</h2>
                <p>같은 상황에서 누가 더 빠르고 알맞게 입힐까요?</p>
              </div>
              <span className="lock-badge" aria-hidden="true">
                잠김
              </span>
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
              <p className="eyebrow">STORY MAP · 1 / 12</p>
              <h1>챕터 2. 날씨 특보</h1>
              <p>비, 바람, 눈 속에서도 안전한 옷을 찾아요.</p>
            </div>
            <div className="chapter-progress" aria-label="챕터 진행률 25퍼센트">
              <span style={{ width: "25%" }} />
            </div>
          </div>
          <div className="episode-list">
            <button className="episode-card episode-active" onClick={() => setStage("messages")}>
              <span className="episode-index">01</span>
              <div>
                <small>첫 번째 긴급 문자</small>
                <h2>비 오는 날의 심부름</h2>
                <p>비가 많이 오는 저녁, 집 앞 마트까지 안전하게 다녀오기</p>
              </div>
              <div className="episode-score">
                <span>{bestScore > 0 ? `${bestScore}점` : "도전 가능"}</span>
                <strong>시작 →</strong>
              </div>
            </button>
            {["여름 워터파크", "겨울 스키 교실"].map((title, index) => (
              <div className="episode-card episode-locked" key={title}>
                <span className="episode-index">0{index + 2}</span>
                <div>
                  <small>첫 임무 완료 후 열림</small>
                  <h2>{title}</h2>
                  <p>새로운 TPO 단서를 기다리고 있어요.</p>
                </div>
                <span className="episode-lock">잠김</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (stage === "messages") {
    return (
      <main className="game-shell message-screen">
        <AppHeader onHome={() => setStage("story")} bestScore={bestScore} />
        <section className="message-layout">
          <div className="mission-copy">
            <p className="eyebrow">{SCENARIO.kicker}</p>
            <h1>{SCENARIO.title}</h1>
            <p>하루의 문자에서 T·P·O 단서를 찾아보세요. 아직 시간은 흐르지 않아요.</p>
            <div className="tpo-clues">
              <div>
                <span>T</span>
                <strong>{SCENARIO.tpo.time}</strong>
              </div>
              <div>
                <span>P</span>
                <strong>{SCENARIO.tpo.place}</strong>
              </div>
              <div>
                <span>O</span>
                <strong>{SCENARIO.tpo.occasion}</strong>
              </div>
            </div>
          </div>
          <div className="phone-frame" aria-label="하루와의 문자 대화">
            <div className="phone-top">
              <button onClick={() => setStage("story")} aria-label="스토리 맵으로 돌아가기">
                ←
              </button>
              <div className="contact">
                <span className="contact-avatar">하</span>
                <div>
                  <strong>하루</strong>
                  <small>지금 접속 중</small>
                </div>
              </div>
              <span className="signal-dots">•••</span>
            </div>
            <div className="chat-body">
              <div className="chat-time">오늘 오후 7:12</div>
              {SCENARIO.messages.map((message, index) => (
                <div
                  className={`chat-row ${
                    message.speaker === "구조대" ? "chat-me" : ""
                  }`}
                  key={message.text}
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <span className="chat-bubble">{message.text}</span>
                </div>
              ))}
            </div>
            <div className="phone-action">
              <button className="primary-button" onClick={beginDressing}>
                60초 옷입히기 시작
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (stage === "dress") {
    const percentage = (timeLeft / SCENARIO.timeLimitSeconds) * 100;
    const availableItems = CLOTHING_ITEMS.filter((item) => item.slot === activeSlot);

    return (
      <main className="game-shell dress-screen">
        <header className="dress-header">
          <button className="back-button compact" onClick={() => setStage("messages")}>
            ← 문자 다시 보기
          </button>
          <div className="mission-title">
            <small>{SCENARIO.kicker}</small>
            <strong>{SCENARIO.title}</strong>
          </div>
          <div className={`timer ${timeLeft <= 10 ? "timer-danger" : ""}`}>
            <div className="timer-ring" style={{ "--progress": `${percentage}%` } as CSSProperties}>
              <strong>{timeLeft}</strong>
            </div>
            <span>초</span>
          </div>
        </header>
        <section className="dress-layout">
          <div className="avatar-panel">
            <div className="weather-strip">
              <span className="weather-icon" aria-hidden="true">
                ☂
              </span>
              <div>
                <strong>비 오는 저녁 · 18°C</strong>
                <small>어두운 길과 큰 웅덩이를 조심해요</small>
              </div>
            </div>
            <div className="avatar-stage">
              <Character selectedItems={selectedItems} mood="thinking" />
              <div className="selected-summary">
                {slots.map((slot) => {
                  const item = selectedItems.find((selected) => selected.slot === slot);
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
            <div className="slot-tabs" role="tablist" aria-label="옷 종류">
              {slots.map((slot) => (
                <button
                  key={slot}
                  role="tab"
                  aria-selected={activeSlot === slot}
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
                    className={`item-card ${isSelected ? "item-selected" : ""}`}
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
                      <span>{item.symbol}</span>
                    </span>
                    <strong>{item.name}</strong>
                    <small>{item.note}</small>
                    <span className="select-label">{isSelected ? "입는 중" : "입어 보기"}</span>
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

  return (
    <main className="game-shell result-screen">
      <AppHeader onHome={goToModes} bestScore={bestScore} />
      {result && (
        <section className="result-layout">
          <div className="result-hero">
            <p className="eyebrow">MISSION COMPLETE</p>
            <h1>{result.stars > 0 ? "하루가 안전하게 출발했어요!" : "한 번 더 살펴볼까요?"}</h1>
            <p>
              {result.stars > 0
                ? "상황의 단서를 잘 읽었어요. 어떤 선택이 점수로 이어졌는지 확인해 봐요."
                : "빠뜨린 안전 단서를 확인하면 다음 도전에서는 훨씬 좋아질 거예요."}
            </p>
            <div className="result-character-wrap">
              <Character selectedItems={selectedItems} mood="happy" />
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
                <span className="best-pill">BEST {bestScore}</span>
              </div>
              <div className="score-list">
                {SCORE_LABELS.map(([key, label, max]) => (
                  <div className="score-line" key={key}>
                    <div>
                      <span>{label}</span>
                      <strong>
                        {result.breakdown[key]}<small> / {max}</small>
                      </strong>
                    </div>
                    <div className="score-track">
                      <span
                        style={{
                          width: `${Math.min(100, (result.breakdown[key] / max) * 100)}%`,
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
                    ? result.strengths
                    : ["선택한 코디를 다시 살펴보면 좋은 단서를 찾을 수 있어요."]
                  ).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="result-card feedback-next">
                <span className="feedback-index">NEXT</span>
                <h3>다음에 더 챙길 점</h3>
                <ul>
                  {(result.improvements.length
                    ? result.improvements
                    : ["안전·활동·예절을 모두 갖춘 멋진 코디예요!"]
                  ).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="tpo-answer">
              <span>T</span>
              <strong>{SCENARIO.tpo.time}</strong>
              <span>P</span>
              <strong>{SCENARIO.tpo.place}</strong>
              <span>O</span>
              <strong>{SCENARIO.tpo.occasion}</strong>
            </div>
            <div className="result-actions">
              <button className="secondary-button" onClick={beginDressing}>
                다시 코디하기
              </button>
              <button className="primary-button" onClick={() => setStage("story")}>
                스토리 맵으로
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
