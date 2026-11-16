// GET /api/stats?key=...&days=30  視聴数の集計を返す（閲覧キー必須）
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

function keyOk(given) {
  const expected = process.env.STATS_KEY || '';
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  if (!keyOk(req.query.key)) return res.status(401).json({ error: 'unauthorized' });

  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [summary, videos, daily, dailyVideos] = await Promise.all([
      sql`
        SELECT
          COUNT(*) FILTER (WHERE event = 'open')::int                       AS opens,
          COUNT(DISTINCT viewer_id) FILTER (WHERE event = 'open')::int      AS open_users,
          COUNT(*) FILTER (WHERE event = 'play')::int                       AS plays,
          COUNT(DISTINCT viewer_id) FILTER (WHERE event = 'play')::int      AS play_users,
          COUNT(*) FILTER (WHERE event = 'complete')::int                   AS completes,
          COUNT(DISTINCT viewer_id) FILTER (WHERE event = 'open' AND is_friend IS TRUE)::int      AS friend_users,
          COUNT(DISTINCT viewer_id) FILTER (WHERE event = 'open' AND is_friend IS FALSE)::int     AS non_friend_users,
          MIN(created_at) AS first_at,
          MAX(created_at) AS last_at
        FROM video_events
      `,
      sql`
        SELECT
          video_key,
          COUNT(*) FILTER (WHERE event = 'play')::int                    AS plays,
          COUNT(DISTINCT viewer_id) FILTER (WHERE event = 'play')::int   AS play_users,
          COUNT(*) FILTER (WHERE event = 'complete')::int                AS completes
        FROM video_events
        WHERE video_key IS NOT NULL
        GROUP BY video_key
        ORDER BY video_key
      `,
      sql`
        SELECT
          to_char((created_at AT TIME ZONE 'Asia/Tokyo')::date, 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE event = 'open')::int                    AS opens,
          COUNT(DISTINCT viewer_id) FILTER (WHERE event = 'open')::int   AS open_users,
          COUNT(*) FILTER (WHERE event = 'play')::int                    AS plays,
          COUNT(*) FILTER (WHERE event = 'complete')::int                AS completes
        FROM video_events
        WHERE created_at >= now() - make_interval(days => ${days})
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      sql`
        SELECT
          to_char((created_at AT TIME ZONE 'Asia/Tokyo')::date, 'YYYY-MM-DD') AS day,
          video_key,
          COUNT(*)::int AS plays
        FROM video_events
        WHERE event = 'play' AND created_at >= now() - make_interval(days => ${days})
        GROUP BY 1, 2
        ORDER BY 1 DESC, 2
      `,
    ]);
    return res.status(200).json({ days, summary: summary[0], videos, daily, dailyVideos });
  } catch (e) {
    console.error('stats failed:', e);
    return res.status(500).json({ error: 'server error' });
  }
};
