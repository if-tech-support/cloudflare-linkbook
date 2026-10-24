# cloudflare-linkbook

[Code Lesson](https://code-lesson.com/) の「Cloudflare開発コース」で作る、チームのリンク帳（AI要約つき）の完成コードです。各フォルダに、そのレッスンを終えた時点のプロジェクト一式が入っています。

- `lesson-1-2` だけは、Worker の仕組みを試す使い捨てのプロジェクト（`hello-worker`）です
- `lesson-1-3` 以降は、同じリンク帳（`linkbook`）を育てていきます
- 概念・設計を扱うレッスン（1-1・2-4・5-4・5-5）は、コードの変更がないためフォルダがありません

| フォルダ | レッスン | 内容 |
|---|---|---|
| [`lesson-1-2/`](lesson-1-2/) | 1-2 | WranglerでWorkerを作ってworkers.devに公開しよう |
| [`lesson-1-3/`](lesson-1-3/) | 1-3 | Honoでリンク帳のAPIを作ろう |
| [`lesson-1-4/`](lesson-1-4/) | 1-4 | Static Assetsで画面とAPIを1つのWorkerから配信しよう |
| [`lesson-2-1/`](lesson-2-1/) | 2-1 | D1にリンクを保存しよう |
| [`lesson-2-2/`](lesson-2-2/) | 2-2 | R2にサムネイル画像を保存しよう |
| [`lesson-2-3/`](lesson-2-3/) | 2-3 | KVで設定値と一覧をキャッシュしよう |
| [`lesson-3-1/`](lesson-3-1/) | 3-1 | Queuesでページの取得を非同期にしよう |
| [`lesson-3-2/`](lesson-3-2/) | 3-2 | Cron Triggersで毎週の新着まとめを作ろう |
| [`lesson-3-3/`](lesson-3-3/) | 3-3 | Durable ObjectsとWebSocketで新着をリアルタイムに通知しよう |
| [`lesson-4-1/`](lesson-4-1/) | 4-1 | Workers AIでページを要約しよう |
| [`lesson-4-2/`](lesson-4-2/) | 4-2 | AI GatewayでAIの利用を記録・制限しよう |
| [`lesson-4-3/`](lesson-4-3/) | 4-3 | Workflowsで取得・要約・保存を1つの流れにしよう |
| [`lesson-4-4/`](lesson-4-4/) | 4-4 | VectorizeでRAGを作り、保存したリンクに質問しよう |
| [`lesson-5-1/`](lesson-5-1/) | 5-1 | Accessで管理画面を保護し、WorkerでJWTを検証しよう |
| [`lesson-5-2/`](lesson-5-2/) | 5-2 | Workers Logsとwrangler tailで動作を見張ろう |
| [`lesson-5-3/`](lesson-5-3/) | 5-3 | Workers Buildsで自動デプロイし、予算アラートを設定しよう |

## 使うもの

- Node.js 22 以上（教材では 24 を使います）
- Wrangler 4（各フォルダの `package.json` に含まれています）
- Cloudflare の無料プランで進められます。R2 を使うときは、無料枠の範囲でもサブスクリプションの手続きが必要です

## 注意

- `wrangler.jsonc` の `xxxxxxxx`・`your-team`・`links.example.com` は、自分のリソースの ID・Access のチーム名・ドメインに置き換えてください
- 秘密の値は `.dev.vars`（手元）と `wrangler secret put`（デプロイ先）で設定し、コミットしないでください
