import type { Leaderboard as LeaderboardData } from "../api";

interface Props {
  data: LeaderboardData | null;
  myNickname?: string | null;
}

export default function Leaderboard({ data, myNickname }: Props) {
  return (
    <div className="leaderboard">
      <h2>🏆 랭킹</h2>
      {!data && <p className="hint">랭킹을 불러올 수 없습니다.</p>}
      {data && data.entries.length === 0 && <p className="hint">아직 기록이 없습니다.</p>}
      {data && data.entries.length > 0 && (
        <ol>
          {data.entries.map((e) => (
            <li key={`${e.rank}-${e.nickname}`} className={e.nickname === myNickname ? "me" : undefined}>
              <span className="rank">{e.rank}</span>
              <span className="name">{e.nickname}</span>
              <span className="score">{e.score.toLocaleString()} m</span>
            </li>
          ))}
        </ol>
      )}
      {data?.my_rank != null && <p className="hint">내 순위: {data.my_rank}위</p>}
    </div>
  );
}
