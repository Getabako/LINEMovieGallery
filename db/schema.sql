-- 視聴計測イベント
-- event: open（アプリを開いた） / play（3秒以上再生） / complete（最後まで再生）
CREATE TABLE IF NOT EXISTS video_events (
  id          BIGSERIAL PRIMARY KEY,
  event       TEXT        NOT NULL,
  video_key   TEXT,
  viewer_id   TEXT,
  in_line     BOOLEAN,
  is_friend   BOOLEAN,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS video_events_created_at_idx ON video_events (created_at);
CREATE INDEX IF NOT EXISTS video_events_event_video_idx ON video_events (event, video_key);
