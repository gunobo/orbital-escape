import { useState } from "react";
import "./App.css";
import GameCanvas from "./components/GameCanvas";
import GameOverScreen from "./components/GameOverScreen";
import HUD from "./components/HUD";
import SettingsScreen from "./components/SettingsScreen";
import { BEST_SCORE_KEY } from "./constants/physics";
import type { GameOverReason, GamePhase, HudSnapshot, ObstacleSettings } from "./types";

const INITIAL_HUD: HudSnapshot = {
  scoreMeters: 0,
  fuel: 100,
  mass: 1,
  misses: 0,
  forwardSpeed: 0,
  lateralSpeed: 0,
  fieldInfo: null,
};

function readBest(): number {
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  return raw ? Number(raw) : 0;
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
  const [best, setBest] = useState<number>(readBest);

  const handleStart = (settings: ObstacleSettings) => {
    setObstacleSettings(settings);
    setResult(null);
    setHud(INITIAL_HUD);
    setRunId((id) => id + 1);
    setPhase("playing");
  };

  const handleGameOver = (score: number, reason: GameOverReason) => {
    setResult({ score, reason });
    if (score > best) {
      setBest(score);
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    }
    setPhase("gameover");
  };

  return (
    <div className="app-root">
      {phase === "settings" && <SettingsScreen best={best} onStart={handleStart} />}

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
          onRestart={() => setPhase("settings")}
        />
      )}
    </div>
  );
}
