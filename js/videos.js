/* ============================================
   MOVIE GALLERY - 動画データ
   アプリ本体（app.js）と集計ページ（stats.html）で共用
   ============================================ */

// --- カテゴリ定義 ---
const CATEGORIES = [
  { key: 'all',      label: 'すべて' },
  { key: 'nakayama', label: '中山拓哉' },
  { key: 'taguchi',  label: '田口成浩' },
  { key: 'ako',      label: '赤穂雷太' },
  { key: 'motoda',   label: '元田大陽' },
  { key: 'wetzell',  label: 'ヤニー・ウェッツェル' },
];

// --- 動画の置き場所（LocalPower の Vercel Blob） ---
const VIDEO_BASE = 'https://0lxd5lv3wmufg6d8.public.blob.vercel-storage.com/movies';

// --- 動画データ ---
const ALL_VIDEOS = [
  {
    src: `${VIDEO_BASE}/01-nakayama.mp4`,
    title: '秋田の心臓',
    category: 'nakayama',
    tags: ['中山拓哉', '選手', '紹介'],
  },
  {
    src: `${VIDEO_BASE}/02-taguchi.mp4`,
    title: '何度でも',
    category: 'taguchi',
    tags: ['田口成浩', '選手', '紹介'],
  },
  {
    src: `${VIDEO_BASE}/03-ako.mp4`,
    title: '双子の誓い',
    category: 'ako',
    tags: ['赤穂雷太', '選手', '紹介'],
  },
  {
    src: `${VIDEO_BASE}/04-motoda.mp4`,
    title: '秋田を照らす光',
    category: 'motoda',
    tags: ['元田大陽', '選手', '紹介'],
  },
  {
    src: `${VIDEO_BASE}/05-wetzell.mp4`,
    title: '世界が秋田へ',
    category: 'wetzell',
    tags: ['ヤニー・ウェッツェル', '選手', '紹介'],
  },
];

// 計測用のキー（ファイル名から拡張子を除いたもの。例: 01-nakayama）
ALL_VIDEOS.forEach((v) => { v.key = v.src.split('/').pop().replace(/\.mp4$/, ''); });

// --- 視聴計測API（LocalPower の Vercel + Neon） ---
const STATS_API = 'https://happinets-movie-gallery.vercel.app';
const TRACK_URL = `${STATS_API}/api/track`;
