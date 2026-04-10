# Memory Game - Claude Code Session Notes

## Project Overview
Next.js 16.1.5 + Cloudflare Workers + Durable Objects を使用したマルチプレイヤーメモリーゲーム。
WebSocketによるリアルタイム同期機能を実装。

## ✅ 完成: サーバー側でゲーム状態を一元管理

**実装内容 (2026-04-02):**

ゲームロジックをDurable Objectに移行し、サーバー側で一元管理するアーキテクチャに変更しました。
これにより、複数プレイヤー間での完全な同期が保証されます。

### アーキテクチャ概要

**サーバー側（Durable Object）の責務:**
- カード状態の管理（フリップ、マッチング）
- プレイヤースコアの管理
- ターン制御と検証
- ゲームロジック（マッチング判定、勝敗判定）
- 全クライアントへの状態同期

**クライアント側の責務:**
- UI表示
- ユーザー入力の受付
- サーバーへのアクション送信
- サーバーからの状態更新受信と反映

## 重要なファイル

### `/src/durable-objects/GameRoom.ts` - ゲーム状態管理
Durable Objectでゲームの全状態とロジックを管理:

**ゲーム状態:**
```typescript
interface GameState {
  cards: Card[];                    // カード配列
  players: Player[];                // プレイヤー配列（sessionIdを含む）
  currentTurnSessionId: string | null;  // 現在のターンのsessionId
  flippedCards: number[];           // フリップ中のカードID
  isProcessing: boolean;            // マッチング処理中フラグ
  status: 'waiting' | 'active' | 'finished';
  winner: Player | null;
}
```

**メッセージタイプ（クライアント → サーバー）:**
- `init_game`: ゲーム初期化（カード配列を送信）
- `register_player`: プレイヤー登録
- `card_click`: カードクリック

**メッセージタイプ（サーバー → クライアント）:**
- `state`: ゲーム状態全体の同期
- `current_turn`: 現在のターン情報
- `players_updated`: プレイヤー一覧更新
- `card_flipped`: カードフリップ
- `cards_matched`: カードマッチ
- `cards_unmatched`: カード不一致
- `player_switched`: ターン切り替え
- `game_end`: ゲーム終了

**主要メソッド:**
- `handleCardClick()`: カードクリック処理（ターン検証含む）
- `checkForMatch()`: マッチング判定
- `switchToNextPlayer()`: 次のプレイヤーにターン切り替え
- `endGame()`: ゲーム終了処理

### `/src/app/[deck_id]/[game_id]/page.tsx` - クライアント側UI
- UIレンダリングと状態表示
- ユーザー入力の受付とサーバーへの送信
- サーバーからの状態更新の反映のみ（ゲームロジックなし）

### `/src/hooks/useGameWebSocket.ts`
- WebSocket接続管理
- メッセージ送受信
- 自動再接続機能

## ゲームフロー

### 初期化フロー
1. クライアント: ページロード
2. クライアント: セッション情報取得
3. クライアント: WebSocket接続
4. クライアント → サーバー: `register_player` 送信
5. サーバー: プレイヤー登録、最初のプレイヤーをcurrentTurnに設定
6. サーバー → 全クライアント: `players_updated`, `current_turn` ブロードキャスト
7. クライアント: DBからカード情報取得
8. クライアント → サーバー: `init_game` 送信
9. サーバー: ゲーム状態初期化
10. サーバー → 全クライアント: `state` ブロードキャスト

### カードクリックフロー
1. クライアント: カードクリック（自分のターンの場合のみ）
2. クライアント → サーバー: `card_click` 送信
3. サーバー: ターン検証
4. サーバー: カード状態更新
5. サーバー → 全クライアント: `card_flipped` ブロードキャスト
6. 2枚目のカードフリップ時:
   - マッチした場合:
     - サーバー: スコア更新
     - サーバー → 全クライアント: `cards_matched` ブロードキャスト
     - 同じプレイヤーのターン継続
   - マッチしない場合:
     - サーバー: 1秒待機
     - サーバー: カードを裏返す
     - サーバー → 全クライアント: `cards_unmatched` ブロードキャスト
     - サーバー: 次のプレイヤーにターン切り替え
     - サーバー → 全クライアント: `player_switched` ブロードキャスト

## デバッグログ

**サーバー側（Durable Object）:**
- `[GameRoom] Initialized currentTurnSessionId to: [sessionId]` - ターン初期化
- `[GameRoom] Game initialized with X cards` - ゲーム初期化
- `[GameRoom] Player registered: [name] [sessionId]` - プレイヤー登録
- `[GameRoom] Invalid turn. Current: [sessionId] Sender: [sessionId]` - 無効なターン
- `[GameRoom] Cards matched: [id1] [id2]` - カードマッチ
- `[GameRoom] Cards did not match. Flipping back in 1 second.` - カード不一致
- `[GameRoom] Turn switched to: [sessionId]` - ターン切り替え
- `[GameRoom] Game ended. Winner: [name]` - ゲーム終了

**クライアント側:**
- `[Page] Received current_turn from server: [sessionId]` - ターン情報受信
- `[WebSocket] Received current_turn:` - WebSocketメッセージ受信
- `Not your turn. Current turn: [sessionId] Your session: [sessionId]` - ターン検証

## 開発サーバー

```bash
# ビルド & 起動
cd /Users/mtanaka/Dev/WebProjects/memory-game
npm run build && npx wrangler dev

# アクセス
http://localhost:8787
```

## テスト方法

1. **開発サーバーを起動**
   ```bash
   cd /Users/mtanaka/Dev/WebProjects/memory-game
   npm run build && npx wrangler dev
   ```

2. **ゲームを作成**
   - ブラウザで `http://localhost:8787` にアクセス
   - デッキを選択してゲームを作成
   - ゲームURLをコピー（例: `http://localhost:8787/hiragana-basic/abc123`）

3. **複数のブラウザで同じゲームにアクセス**
   - ブラウザ1: 通常モードでゲームURL
   - ブラウザ2: シークレットモードで同じURL
   - それぞれでプレイヤー名を設定

4. **ゲームプレイをテスト**
   - ターンインジケーター（"Current Turn"）が1人だけに表示されることを確認
   - 自分のターンの時だけカードがクリックできることを確認
   - カードをマッチさせると:
     - スコアが更新される
     - 同じプレイヤーのターンが継続する
   - カードがマッチしないと:
     - 1秒後にカードが裏返る
     - 次のプレイヤーにターンが切り替わる
   - 全カードがマッチすると勝者モーダルが表示される

5. **ブラウザコンソールでログを確認**
   - サーバー側ログ（Wranglerのターミナル）:
     - `[GameRoom] Player registered:`
     - `[GameRoom] Cards matched:` または `Cards did not match`
     - `[GameRoom] Turn switched to:`
   - クライアント側ログ（ブラウザコンソール）:
     - `[Page] Received current_turn from server:`
     - `Received player_switched:`

## 主な改善点

✅ **完全なサーバー側制御**
- カードのマッチング判定はサーバー側で実行
- ターン検証もサーバー側で実行
- クライアント間の不整合を防止

✅ **競合状態の防止**
- `isProcessing` フラグでマッチング処理中の追加クリックを防止
- サーバー側でターン検証を行い、不正なクリックを拒否

✅ **完全な同期**
- 全てのゲーム状態変更はサーバー側で行われ、全クライアントにブロードキャスト
- クライアントは表示のみを担当

## 技術スタック

- Next.js 16.1.5 (App Router + Turbopack)
- Cloudflare Workers + Durable Objects
- WebSocket (リアルタイム同期)
- Supabase (データベース)
- TypeScript
