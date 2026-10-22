import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { api, ApiError, loadToken, saveToken } from "./api";
import type { ApiUser, AppConfig, Leaderboard as LeaderboardData, ScoreResult } from "./api";
import AccountPanel from "./components/AccountPanel";
import ControlBar from "./components/ControlBar";
import GameCanvas from "./components/GameCanvas";
import GameOverScreen, { type SubmitState } from "./components/GameOverScreen";
import HintToast, { type Hint } from "./components/HintToast";
import HUD from "./components/HUD";
import Leaderboard from "./components/Leaderboard";
import PauseOverlay from "./components/PauseOverlay";
import PhysicsPanel from "./components/PhysicsPanel";
import type { ControlMode } from "./components/Scene";
import { nextPhysicsView, type PhysicsView } from "./constants/physicsView";
import SettingsScreen from "./components/SettingsScreen";
import { VIEW_ORDER, type ViewId } from "./constants/camera";
import { BEST_SCORE_KEY, FUEL_MAX, MAX_MISSES, OIL_TRIGGER_THRESHOLD } from "./constants/physics";
import type { ConceptId } from "./learning/concepts";
import { loadProgress, recordAnswer, type Progress } from "./learning/progress";
import { pickQuiz, type Question } from "./learning/quiz";
import type { GameOverReason, GamePhase, HudSnapshot, ObstacleSettings, RunSummary } from "./types";

const INITIAL_HUD: HudSnapshot = {
  scoreMeters: 0,
  fuel: FUEL_MAX,
  mass: 1.6,
  misses: 0,
  streak: 0,
  gate: null,
  physics: {
    mass: 1.6,
    inertialControl: true,
    field: null,
    vForward: 0,
    vUp: 0,
    vRight: 0,
    thrustForce: 0,
    thrustAccel: 0,
    ke: 0,
    pe: 0,
    engineWork: 0,
    brakeLoss: 0,
  },
};

const CONTROL_MODE_KEY = "orbital-escape-control-mode";
const VIEW_KEYS: Record<string, ViewId> = {
  Digit1: "chase",
  Digit2: "high",
  Digit3: "top",
  Digit4: "side",
  Digit5: "cockpit",
};

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function readControlMode(): ControlMode {
  try {
    return localStorage.getItem(CONTROL_MODE_KEY) === "keyboard" ? "keyboard" : "mouse";
  } catch {
    return "mouse";
  }
}

function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : "서버에 연결할 수 없습니다.";
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("settings");
  const [obstacleSettings, setObstacleSettings] = useState<ObstacleSettings>({
    verticalSpeed: 3,
    horizontalSpeed: 2,
  });
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [result, setResult] = useState<{ score: number; reason: GameOverReason } | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [runId, setRunId] = useState(0);
  const [localBest, setLocalBest] = useState<number>(readBest);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [token, setToken] = useState<string | null>(loadToken);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverResult, setServerResult] = useState<ScoreResult | null>(null);

  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [view, setView] = useState<ViewId>("chase");
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // 물리 보기: 끔 → 화살표만(기본) → 화살표 + 패널. 기본 화면은 글이 거의 없게 한다
  const [physicsView, setPhysicsView] = useState<PhysicsView>("arrows");
  const [controlMode, setControlModeState] = useState<ControlMode>(readControlMode);
  const [inertialControl, setInertialControl] = useState(true);
  const [hint, setHint] = useState<Hint | null>(null);

  const pausedRef = useRef(false);
  const shownHints = useRef(new Set<string>());
  const hintTimer = useRef<number | undefined>(undefined);
  const prevHud = useRef<HudSnapshot | null>(null);

  const best = Math.max(localBest, user?.best_score ?? 0);
  const frozen = paused || countdown !== null;

  // ── 서버 연결 / 로그인 ────────────────────────────────────────
  const loadConfig = () => api.config().then(setConfig).catch(() => setConfig(null));

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (!token) return;
    api
      .me(token)
      .then(setUser)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          saveToken(null);
          setToken(null);
        }
      });
  }, [token]);

  useEffect(() => {
    if (phase === "playing") return;
    api.leaderboard(token).then(setBoard).catch(() => setBoard(null));
  }, [phase, token, user?.nickname, serverResult]);

  const applyLogin = (res: { token: string; user: ApiUser }) => {
    saveToken(res.token);
    setToken(res.token);
    setUser(res.user);
    setAuthError(null);
  };

  const handleGoogle = (credential: string) =>
    api.loginGoogle(credential).then(applyLogin).catch((e) => setAuthError(errorMessage(e)));

  const handleDevLogin = (name: string) =>
    api.loginDev(name).then(applyLogin).catch((e) => setAuthError(errorMessage(e)));

  const handleSetNickname = async (nickname: string): Promise<boolean> => {
    if (!token) return false;
    try {
      setUser(await api.setNickname(token, nickname));
      setAuthError(null);
      return true;
    } catch (e) {
      setAuthError(errorMessage(e));
      return false;
    }
  };

  const handleLogout = () => {
    saveToken(null);
    setToken(null);
    setUser(null);
  };

  // ── 일시정지 / 시점 / 조종 방식 ──────────────────────────────
  const setPausedBoth = useCallback((value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
  }, []);

  const pauseGame = useCallback(() => {
    setCountdown(null);
    setPausedBoth(true);
  }, [setPausedBoth]);

  const resumeGame = useCallback(() => {
    setPausedBoth(false);
    setCountdown(2); // 다시 시작하기 전에 마음의 준비를 할 시간
  }, [setPausedBoth]);

  const togglePause = useCallback(() => {
    if (pausedRef.current) resumeGame();
    else pauseGame();
  }, [pauseGame, resumeGame]);

  const setControlMode = useCallback((mode: ControlMode) => {
    setControlModeState(mode);
    try {
      localStorage.setItem(CONTROL_MODE_KEY, mode);
    } catch {
      /* 무시 */
    }
  }, []);

  useEffect(() => {
    if (countdown === null || paused) return;
    const t = window.setTimeout(() => setCountdown((c) => (c !== null && c > 1 ? c - 1 : null)), 1000);
    return () => window.clearTimeout(t);
  }, [countdown, paused]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
      } else if (e.code === "KeyC") {
        setView((v) => VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length]);
      } else if (VIEW_KEYS[e.code]) {
        setView(VIEW_KEYS[e.code]);
      } else if (e.code === "KeyH") {
        setPhysicsView(nextPhysicsView);
      } else if (e.code === "KeyZ") {
        setInertialControl((v) => !v);
      } else if (e.code === "KeyM") {
        setControlModeState((m) => {
          const next: ControlMode = m === "mouse" ? "keyboard" : "mouse";
          try {
            localStorage.setItem(CONTROL_MODE_KEY, next);
          } catch {
            /* 무시 */
          }
          return next;
        });
      }
    };
    // 포커스된 버튼이 Space로 눌리지 않게 한다
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();
    };
    const autoPause = () => {
      if (!pausedRef.current) pauseGame();
    };
    const onVisibility = () => {
      if (document.hidden) autoPause();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", autoPause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", autoPause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase, togglePause, pauseGame]);

  // ── 학습 힌트: 해당 개념을 처음 겪는 순간에 한 번 알려 준다 ──────
  const showHint = useCallback((next: Hint, ms = 8000, once = true) => {
    if (once) {
      if (shownHints.current.has(next.id)) return;
      shownHints.current.add(next.id);
    }
    setHint({ ...next, life: ms });
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), ms);
  }, []);

  const handleHud = useCallback(
    (h: HudSnapshot) => {
      setHud(h);
      const prev = prevHud.current;
      prevHud.current = h;

      if (prev && h.misses > prev.misses) {
        const left = Math.max(0, MAX_MISSES - h.misses);
        showHint({ id: `life-${h.misses}`, title: `목숨 ${left}개 남았어요`, tone: "warn" }, 2500, false);
      }
      if (h.physics.field) {
        showHint({ id: "gravity", title: "가까울수록 중력이 세져요 (F = GMm/r²)" }, 5000);
      }
      if (h.physics.thrustForce > 0) {
        showHint({ id: "thrust", title: "엔진 힘 F는 가속도 a = F/m 로 나타나요" }, 4500);
      }
      if (h.fuel <= OIL_TRIGGER_THRESHOLD) {
        showHint({ id: "fuel", title: "연료가 부족해요. 주황색 기름을 먹으세요" }, 5000);
      }
      if (prev && h.fuel - prev.fuel > 30) {
        showHint({ id: "oil", title: "무거워지면 같은 힘으로도 가속이 느려져요" }, 5000);
      }
    },
    [showHint],
  );

  // ── 게임 시작 / 종료 ─────────────────────────────────────────
  const handleStart = (settings: ObstacleSettings) => {
    setObstacleSettings(settings);
    setResult(null);
    setSummary(null);
    setQuestions([]);
    setServerResult(null);
    setSubmitState("idle");
    setHud(INITIAL_HUD);
    prevHud.current = null;
    setInertialControl(true);
    setPausedBoth(false);
    setCountdown(3);
    setRunId((id) => id + 1);
    setPhase("playing");
    showHint({ id: "start", title: "마우스로 고리를 가리키세요. Space는 일시정지" }, 6000);
  };

  const submitScore = (score: number) => {
    if (!token) return setSubmitState("no-login");
    if (!user) return setSubmitState("error");
    if (!user.nickname) return setSubmitState("no-nickname");

    setSubmitState("submitting");
    api
      .submitScore(token, score)
      .then((res) => {
        setServerResult(res);
        setUser((u) => (u ? { ...u, best_score: res.best_score } : u));
        setSubmitState("done");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          handleLogout();
          setSubmitState("expired");
        } else {
          setSubmitState("error");
        }
      });
  };

  const handleGameOver = (score: number, reason: GameOverReason, runSummary: RunSummary) => {
    setResult({ score, reason });
    setSummary(runSummary);
    setQuestions(pickQuiz(runSummary, progress, Math.random, 3));
    setHint(null);
    if (score > localBest) {
      setLocalBest(score);
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(score));
      } catch {
        /* 저장소 사용 불가 시 무시 */
      }
    }
    setPhase("gameover");
    submitScore(score);
  };

  const handleAnswer = (concept: ConceptId, correct: boolean) => {
    setProgress((p) => recordAnswer(p, concept, correct));
  };

  const leaderboardSlot = <Leaderboard data={board} myNickname={user?.nickname} />;

  return (
    <div className="app-root">
      {phase === "settings" && (
        <SettingsScreen
          best={best}
          leaderboardSlot={leaderboardSlot}
          progress={progress}
          controlMode={controlMode}
          onControlMode={setControlMode}
          accountSlot={
            <AccountPanel
              config={config}
              user={user}
              error={authError}
              onGoogleCredential={handleGoogle}
              onDevLogin={handleDevLogin}
              onSetNickname={handleSetNickname}
              onLogout={handleLogout}
              onRetryConfig={loadConfig}
            />
          }
          onStart={handleStart}
        />
      )}

      {phase === "playing" && (
        <>
          <GameCanvas
            key={runId}
            obstacleSettings={obstacleSettings}
            view={view}
            frozen={frozen}
            controlMode={controlMode}
            inertialControl={inertialControl}
            showArrows={physicsView !== "off"}
            onHud={handleHud}
            onGameOver={handleGameOver}
          />
          <HUD hud={hud} best={best} />
          <ControlBar
            view={view}
            onView={setView}
            controlMode={controlMode}
            onControlMode={setControlMode}
            physicsView={physicsView}
            onCyclePhysics={() => setPhysicsView(nextPhysicsView)}
            inertialControl={inertialControl}
            onToggleInertial={() => setInertialControl((v) => !v)}
            onPause={pauseGame}
          />
          {physicsView === "full" && <PhysicsPanel p={hud.physics} />}
          <HintToast hint={hint} />
          {countdown !== null && !paused && (
            <div className="countdown" key={countdown}>
              {countdown}
            </div>
          )}
          {paused && <PauseOverlay onResume={resumeGame} onQuit={() => setPhase("settings")} />}
        </>
      )}

      {phase === "gameover" && result && (
        <GameOverScreen
          score={result.score}
          reason={result.reason}
          best={best}
          serverResult={serverResult}
          submitState={submitState}
          summary={summary}
          questions={questions}
          onAnswer={handleAnswer}
          leaderboardSlot={leaderboardSlot}
          onRestart={() => setPhase("settings")}
          onRetrySubmit={() => submitScore(result.score)}
        />
      )}
    </div>
  );
}
