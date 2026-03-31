/// <reference types="@cloudflare/workers-types" />

declare module '@opennextjs/cloudflare' {
  interface CloudflareEnv {
    SUPABASE_CONNECTION_STRING: string;
    GAME_ROOM: DurableObjectNamespace;
  }
}

interface Env {
  SUPABASE_CONNECTION_STRING: string;
  GAME_ROOM: DurableObjectNamespace;
}
