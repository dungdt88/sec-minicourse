// The app's own Postgres schema. Production shares a Supabase project with other apps, so the
// app keeps everything here and nothing in `public`. Every Supabase client (player, mentor
// console, scripts) is created with `db: { schema: DB_SCHEMA }`, so table reads and rpc calls go
// here. The schema must be exposed by the API: config.toml [api] schemas locally, Project
// Settings → Data API → Exposed schemas on a hosted project.
export const DB_SCHEMA = 'sec_minicourse';
