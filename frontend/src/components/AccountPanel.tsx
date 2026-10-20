import { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import type { ApiUser, AppConfig } from "../api";

interface Props {
  config: AppConfig | null;
  user: ApiUser | null;
  error: string | null;
  onGoogleCredential: (credential: string) => void;
  onDevLogin: (name: string) => void;
  onSetNickname: (nickname: string) => Promise<boolean>;
  onLogout: () => void;
}

export default function AccountPanel({
  config,
  user,
  error,
  onGoogleCredential,
  onDevLogin,
  onSetNickname,
  onLogout,
}: Props) {
  const [nickname, setNickname] = useState("");
  const [devName, setDevName] = useState("tester");
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="account">
        {config?.google_client_id && (
          <GoogleOAuthProvider clientId={config.google_client_id}>
            <GoogleLogin
              theme="filled_black"
              onSuccess={(res) => res.credential && onGoogleCredential(res.credential)}
              onError={() => undefined}
            />
          </GoogleOAuthProvider>
        )}
        {config?.dev_auth && (
          <div className="dev-login">
            <input value={devName} onChange={(e) => setDevName(e.target.value)} aria-label="개발용 로그인 이름" />
            <button className="ghost-btn" onClick={() => onDevLogin(devName)}>
              개발용 로그인
            </button>
          </div>
        )}
        {config && !config.google_client_id && !config.dev_auth && (
          <p className="hint">로그인이 설정되지 않아 로컬 기록만 저장됩니다.</p>
        )}
        {!config && <p className="hint">서버에 연결할 수 없어 로컬 기록만 저장됩니다.</p>}
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (!user.nickname) {
    const submit = async () => {
      setSaving(true);
      const ok = await onSetNickname(nickname.trim());
      setSaving(false);
      if (ok) setNickname("");
    };
    return (
      <div className="account">
        <p className="hint">랭킹에 표시될 닉네임을 정해주세요. (2~12자, 한글/영문/숫자/_/-)</p>
        <div className="dev-login">
          <input
            value={nickname}
            maxLength={12}
            placeholder="닉네임"
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !saving && submit()}
          />
          <button className="ghost-btn" disabled={saving || nickname.trim().length < 2} onClick={submit}>
            저장
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="account account-logged">
      <span>
        <strong>{user.nickname}</strong> 님
      </span>
      <button className="ghost-btn" onClick={onLogout}>
        로그아웃
      </button>
    </div>
  );
}
