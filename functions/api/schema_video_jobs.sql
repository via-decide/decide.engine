CREATE TABLE video_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT,
  pair_id TEXT,
  title TEXT,
  payload_json TEXT,
  status TEXT DEFAULT 'queued',
  youtube_url TEXT
);
