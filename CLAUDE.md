## Environment Variables

This project deploys to Cloudflare Workers.

- Environment variables should be written in **`.dev.vars`** instead of `.env`
- `.dev.vars` is the file that `wrangler dev` loads during local development
- Format is the same as `.env`: `KEY=VALUE` format

### NG (Not Good)
```env
VITE_API_KEY=xxx
```

### OK
```ini
# .dev.vars
API_KEY=xxx
```

- The `[vars]` block in `wrangler.toml` is used for production non-secret variables
- Deploy production secrets using the `wrangler secret put KEY` command


## Server

デプロイや、開発サーバの起動・停止はこちらで実施します。
プロセス操作をしないでください。
