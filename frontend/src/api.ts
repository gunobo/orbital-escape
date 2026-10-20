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

const TOKEN_KEY = "orbital-escape-token";

export function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 저장소 사용 불가 환경에서는 세션 동안만 유지 */
  }
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
  const res = await fetch(`/api${path}`, { ...init, headers });
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
  submitScore: (token: string, score: number) =>
    request<ScoreResult>("/scores", { method: "POST", body: JSON.stringify({ score }) }, token),
  leaderboard: (token?: string | null, limit = 10) =>
    request<Leaderboard>(`/leaderboard?limit=${limit}`, {}, token),
};
