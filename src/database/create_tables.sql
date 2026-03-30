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


-- =====================================================
-- Decks Table
-- =====================================================

CREATE TABLE memory_game.decks (
  deck_id          TEXT PRIMARY KEY,                -- デッキID (例: hiragana-katakana)
  description      TEXT        NOT NULL,            -- デッキの説明
  number_of_cards  INTEGER     NOT NULL,            -- カードの枚数（常に偶数）
  pairs            JSONB       NOT NULL,            -- ペアの配列（隣接する要素がペア）
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pairs構造の例:
-- ["あ", "ア", "い", "イ", "う", "ウ", ...]
-- 隣接する2つの要素が1ペアを形成

-- インデックス
CREATE INDEX idx_decks_updated_at ON memory_game.decks (updated_at);

-- バックエンドからのみアクセス許可
ALTER TABLE memory_game.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON memory_game.decks
  USING (auth.role() = 'service_role');

-- 初期データの挿入
INSERT INTO memory_game.decks (deck_id, description, number_of_cards, pairs) VALUES
(
  'hiragana-katakana',
  'Match hiragana characters with their katakana equivalents',
  20,
  '["あ", "ア", "い", "イ", "う", "ウ", "え", "エ", "お", "オ", "か", "カ", "き", "キ", "く", "ク", "け", "ケ", "こ", "コ"]'::jsonb
),
(
  'english-japanese-basics',
  'Match common English phrases with their Japanese translations',
  16,
  '["Hello", "こんにちは", "Thank you", "ありがとう", "Good morning", "おはよう", "Goodbye", "さようなら", "Yes", "はい", "No", "いいえ", "Please", "お願いします", "Sorry", "ごめんなさい"]'::jsonb
);


-- =====================================================
-- Games Table
-- =====================================================

CREATE TABLE memory_game.games (
  id         TEXT PRIMARY KEY,                    -- ゲームID (例: game-1774895194762)
  deck_id    TEXT        NOT NULL,                -- デッキID (例: hiragana-katakana)
  cards      JSONB       NOT NULL,                -- カード情報の配列
  players    JSONB       NOT NULL DEFAULT '[]',   -- 参加者情報の配列
  current_player_index INTEGER NOT NULL DEFAULT 0, -- 現在のプレイヤーのインデックス
  status     TEXT        NOT NULL DEFAULT 'active', -- active, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- カード構造の例:
-- [
--   {
--     "id": 0,
--     "content": "Hello",
--     "pairId": 0,
--     "position": 0,
--     "isMatched": false,
--     "rotation": -2.5
--   },
--   ...
-- ]

-- プレイヤー構造の例:
-- [
--   {
--     "sessionId": "sess_1774895194762_abc123",
--     "playerName": "Alice",
--     "score": 3
--   },
--   {
--     "sessionId": "sess_1774895194763_def456",
--     "playerName": "Bob",
--     "score": 5
--   }
-- ]

-- インデックス
CREATE INDEX idx_games_deck_id ON memory_game.games (deck_id);
CREATE INDEX idx_games_status ON memory_game.games (status);
CREATE INDEX idx_games_created_at ON memory_game.games (created_at);

-- 自動削除は不要
-- SELECT cron.schedule(
--   'delete-old-games',
--   '0 2 * * *',  -- 毎日午前2時
--   $$DELETE FROM memory_game.games WHERE created_at < NOW() - INTERVAL '7 days'$$
-- );

-- バックエンドからのみアクセス許可
ALTER TABLE memory_game.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON memory_game.games
  USING (auth.role() = 'service_role');

