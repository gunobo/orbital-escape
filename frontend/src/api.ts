export interface ApiUser {
  id: number;
  nickname: string | null;
  best_score: number;
}

export interface AppConfig {
  google_client_id: string;
  dev_auth: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  my_rank: number | null;
}

export interface ScoreResult {
  best_score: number;
  is_new_best: boolean;
  rank: number;
}

// science26 은 모든 학생 페이지가 같은 도메인을 써서 localStorage 가 공유된다.
// 로그인 토큰은 저장소에 남기지 않고 메모리에만 둔다 (새로고침하면 다시 로그인)
let memoryToken: string | null = null;

export function loadToken(): string | null {
  return memoryToken;
}

export function saveToken(token: string | null): void {
  memoryToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`api${path}`, { ...init, headers });
  if (!res.ok) {
    let message = "요청에 실패했습니다.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        message = String(body.detail[0].msg).replace(/^Value error, /, "");
      }
    } catch {
      /* 본문이 JSON이 아니면 기본 메시지 사용 */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  config: () => request<AppConfig>("/config"),
  loginGoogle: (credential: string) =>
    request<{ token: string; user: ApiUser }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
  loginDev: (name: string) =>
    request<{ token: string; user: ApiUser }>("/auth/dev", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  me: (token: string) => request<ApiUser>("/me", {}, token),
  setNickname: (token: string, nickname: string) =>
    request<ApiUser>("/me/nickname", { method: "PUT", body: JSON.stringify({ nickname }) }, token),
  /** 게임을 시작할 때 부른다. 서버가 시작 시각을 기억해 두었다가 점수가 가능한 값인지 확인한다 */
  startRun: (token: string) => request<{ run_id: number }>("/runs", { method: "POST" }, token),
  submitScore: (token: string, score: number, runId: number) =>
    request<ScoreResult>("/scores", { method: "POST", body: JSON.stringify({ score, run_id: runId }) }, token),
  leaderboard: (token?: string | null, limit = 10) =>
    request<Leaderboard>(`/leaderboard?limit=${limit}`, {}, token),
};
