CREATE TABLE memory_game.sessions (
  id         TEXT PRIMARY KEY,                    -- セッションID（Cookie に入れる値）
  data       JSONB        NOT NULL DEFAULT '{}',  -- セッションデータ
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 期限切れ削除の高速化
CREATE INDEX idx_sessions_expires_at ON memory_game.sessions (expires_at);

-- 定期削除（毎時）
-- Supabase で pg_cron を有効化する必要があります。
-- Database → Extensions → pg_cron を検索 → Enable
SELECT cron.schedule(
  'delete-expired-sessions',
  '0 * * * *',
  $$DELETE FROM memory_game.sessions WHERE expires_at < NOW()$$
);

-- バックエンドからのみアクセス許可
ALTER TABLE memory_game.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON memory_game.sessions
  USING (auth.role() = 'service_role');

