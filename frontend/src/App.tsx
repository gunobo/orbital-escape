import { useEffect, useState } from "react";
import "./App.css";
import { api, ApiError, loadToken, saveToken } from "./api";
import type { ApiUser, AppConfig, Leaderboard as LeaderboardData, ScoreResult } from "./api";
import AccountPanel from "./components/AccountPanel";
import GameCanvas from "./components/GameCanvas";
import GameOverScreen, { type SubmitState } from "./components/GameOverScreen";
import HUD from "./components/HUD";
import Leaderboard from "./components/Leaderboard";
import SettingsScreen from "./components/SettingsScreen";
import { BEST_SCORE_KEY } from "./constants/physics";
import type { GameOverReason, GamePhase, HudSnapshot, ObstacleSettings } from "./types";

const INITIAL_HUD: HudSnapshot = {
  scoreMeters: 0,
  fuel: 100,
  mass: 1,
  misses: 0,
  streak: 0,
  gate: null,
  forwardSpeed: 0,
  lateralSpeed: 0,
  fieldInfo: null,
};

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
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
  const [runId, setRunId] = useState(0);
  const [localBest, setLocalBest] = useState<number>(readBest);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [token, setToken] = useState<string | null>(loadToken);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [serverResult, setServerResult] = useState<ScoreResult | null>(null);

  const best = Math.max(localBest, user?.best_score ?? 0);

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

  const handleStart = (settings: ObstacleSettings) => {
    setObstacleSettings(settings);
    setResult(null);
    setServerResult(null);
    setSubmitState("idle");
    setHud(INITIAL_HUD);
    setRunId((id) => id + 1);
    setPhase("playing");
  };

  const handleGameOver = (score: number, reason: GameOverReason) => {
    setResult({ score, reason });
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

  const leaderboardSlot = <Leaderboard data={board} myNickname={user?.nickname} />;

  return (
    <div className="app-root">
      {phase === "settings" && (
        <SettingsScreen
          best={best}
          leaderboardSlot={leaderboardSlot}
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
            onHud={setHud}
            onGameOver={handleGameOver}
          />
          <HUD hud={hud} best={best} />
        </>
      )}

      {phase === "gameover" && result && (
        <GameOverScreen
          score={result.score}
          reason={result.reason}
          best={best}
          serverResult={serverResult}
          submitState={submitState}
          leaderboardSlot={leaderboardSlot}
          onRestart={() => setPhase("settings")}
          onRetrySubmit={() => submitScore(result.score)}
        />
      )}
    </div>
  );
}
