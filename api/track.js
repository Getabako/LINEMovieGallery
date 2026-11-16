// POST /api/track  視聴計測イベントを1件記録する
// 本体: {"e":"open|play|complete","v":"01-nakayama","u":"端末ランダムID","l":true,"f":null}
// sendBeacon から text/plain で届くため、本文は自前でJSONとして読む
const { neon } = require('@neondatabase/serverless');

const EVENTS = new Set(['open', 'play', 'complete']);
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(safeParse(req.body));
  if (Buffer.isBuffer(req.body)) return Promise.resolve(safeParse(req.body.toString('utf8')));
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2000) req.destroy(); });
    req.on('end', () => resolve(safeParse(raw)));
    req.on('error', () => resolve(null));
  });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const b = await readBody(req);
  if (!b || !EVENTS.has(b.e)) return res.status(400).json({ error: 'bad request' });

  const event = b.e;
  const videoKey = typeof b.v === 'string' && KEY_RE.test(b.v) ? b.v : null;
  if (event !== 'open' && !videoKey) return res.status(400).json({ error: 'bad request' });
  const viewerId = typeof b.u === 'string' && ID_RE.test(b.u) ? b.u : null;
  const inLine = typeof b.l === 'boolean' ? b.l : null;
  const isFriend = typeof b.f === 'boolean' ? b.f : null;

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO video_events (event, video_key, viewer_id, in_line, is_friend)
      VALUES (${event}, ${event === 'open' ? null : videoKey}, ${viewerId}, ${inLine}, ${isFriend})
    `;
    return res.status(204).end();
  } catch (e) {
    console.error('track failed:', e);
    return res.status(500).json({ error: 'server error' });
  }
};
