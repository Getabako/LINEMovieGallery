/* ============================================
   秋田ノーザンハピネッツ MOVIE GALLERY
   LINE LIFF App - Main Application
   ============================================ */

// --- 動画データ ---
const VIDEOS = [
  {
    id: '4DzlWiyNPJU',
    title: '秋田ノーザンハピネッツ ハイライト',
    description: '試合のハイライト映像をお届けします。',
  },
  {
    id: 'hjX5rhceKpA',
    title: '秋田ノーザンハピネッツ ゲームレポート',
    description: '注目のプレーをピックアップ。',
  },
  {
    id: 'D2nR0NFsgbo',
    title: '秋田ノーザンハピネッツ スペシャルムービー',
    description: 'チームの魅力をお届けするスペシャルコンテンツ。',
  },
];

// --- LIFF設定 ---
const LIFF_ID = '2009109071-mxy5adpB';

// --- グローバル変数 ---
let swiper = null;
let players = {};
let currentIndex = 0;
let isLandscape = false;
let overlayTimer = null;
let ytApiReady = false;
let appInitialized = false;

// --- YouTube IFrame API Ready ---
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  if (appInitialized) {
    createPlayerForSlide(currentIndex);
  }
};

// --- アプリ初期化 ---
document.addEventListener('DOMContentLoaded', function () {
  initApp();
});

async function initApp() {
  // LIFF初期化（IDが設定されている場合）
  if (LIFF_ID) {
    try {
      await liff.init({ liffId: LIFF_ID });
    } catch (e) {
      console.warn('LIFF init failed:', e);
    }
  }

  // UIを構築
  buildSwiperSlides();
  buildVideoGrid();
  initSwiper();
  updateVideoInfo(0);
  updateDots(0);
  setupOrientationHandler();
  setupLandscapeControls();

  appInitialized = true;

  // YouTube APIが既に読み込まれている場合
  if (ytApiReady) {
    createPlayerForSlide(0);
  }
}

// --- スワイパースライド構築 ---
function buildSwiperSlides() {
  const wrapper = document.getElementById('swiperWrapper');
  wrapper.innerHTML = VIDEOS.map((video, index) => `
    <div class="swiper-slide" data-index="${index}">
      <div class="video-frame-wrapper" id="playerWrapper-${index}">
        <div class="video-thumbnail-slide" id="thumbnail-${index}">
          <img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${video.title}">
          <div class="thumbnail-play-icon"></div>
        </div>
        <div class="touch-overlay" data-index="${index}">
          <div class="tap-to-play" id="tapIcon-${index}"></div>
        </div>
      </div>
    </div>
  `).join('');

  // タッチオーバーレイにイベント設定
  document.querySelectorAll('.touch-overlay').forEach(overlay => {
    setupTouchOverlay(overlay);
  });
}

// --- タッチオーバーレイのイベント設定 ---
function setupTouchOverlay(overlay) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  const TAP_THRESHOLD = 15; // px以内ならタップ判定
  const TAP_TIME = 300;     // ms以内ならタップ判定

  overlay.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  overlay.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    const dt = Date.now() - touchStartTime;

    // スワイプではなくタップの場合 → 再生/一時停止
    if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD && dt < TAP_TIME) {
      const index = parseInt(overlay.dataset.index);
      togglePlayPause(index);
    }
    // スワイプの場合はSwiperが処理するので何もしない
  }, { passive: true });

  // クリック（PC用）
  overlay.addEventListener('click', (e) => {
    const index = parseInt(overlay.dataset.index);
    togglePlayPause(index);
  });
}

// --- 再生/一時停止トグル ---
function togglePlayPause(index) {
  const player = players[index];
  if (!player) {
    // プレーヤーがまだない場合は作成
    createPlayerForSlide(index);
    return;
  }

  try {
    const state = player.getPlayerState();
    const tapIcon = document.getElementById(`tapIcon-${index}`);

    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      if (tapIcon) {
        tapIcon.classList.add('paused', 'show');
        setTimeout(() => tapIcon.classList.remove('show'), 800);
      }
    } else {
      player.playVideo();
      if (tapIcon) {
        tapIcon.classList.remove('paused');
        tapIcon.classList.add('show');
        setTimeout(() => tapIcon.classList.remove('show'), 800);
      }
    }
  } catch (e) {
    createPlayerForSlide(index);
  }
}

// --- 動画一覧グリッド構築 ---
function buildVideoGrid() {
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = VIDEOS.map((video, index) => `
    <div class="video-card ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToVideo(${index})">
      <div class="card-thumbnail">
        <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}">
        ${index === 0 ? '<span class="card-now-playing">再生中</span>' : ''}
      </div>
      <div class="card-info">
        <div class="card-title">${video.title}</div>
        <div class="card-meta">秋田ノーザンハピネッツ</div>
      </div>
    </div>
  `).join('');
}

// --- Swiper初期化 ---
function initSwiper() {
  swiper = new Swiper('#playerSwiper', {
    slidesPerView: 1,
    spaceBetween: 0,
    resistance: true,
    resistanceRatio: 0.3,
    speed: 300,
    threshold: 10,
    touchEventsTarget: 'container',
    on: {
      slideChange: function () {
        const newIndex = this.activeIndex;
        onSlideChange(newIndex);
      },
    },
  });
}

// --- スライド切り替え処理 ---
function onSlideChange(newIndex) {
  // 前の動画を停止
  pausePlayer(currentIndex);

  currentIndex = newIndex;

  // UI更新
  updateVideoInfo(newIndex);
  updateDots(newIndex);
  updateVideoGrid(newIndex);
  updateLandscapeUI(newIndex);

  // 新しいスライドのプレーヤーを作成/再生
  createPlayerForSlide(newIndex);
}

// --- 動画一覧から選択 ---
function goToVideo(index) {
  if (swiper) {
    swiper.slideTo(index);
  }
}

// --- YouTube プレーヤー作成 ---
function createPlayerForSlide(index) {
  if (!ytApiReady) return;

  const video = VIDEOS[index];
  const thumbnail = document.getElementById(`thumbnail-${index}`);

  // 既にプレーヤーが存在する場合は再生
  if (players[index]) {
    try {
      players[index].playVideo();
    } catch (e) {
      // プレーヤーが破損している場合は再作成
      rebuildPlayer(index);
    }
    return;
  }

  // サムネイルを隠す
  if (thumbnail) {
    thumbnail.style.display = 'none';
  }

  // iframeコンテナ作成
  const wrapper = document.getElementById(`playerWrapper-${index}`);
  const playerDiv = document.createElement('div');
  playerDiv.id = `ytplayer-${index}`;
  wrapper.appendChild(playerDiv);

  // YouTube プレーヤー作成
  players[index] = new YT.Player(`ytplayer-${index}`, {
    videoId: video.id,
    playerVars: {
      autoplay: 1,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      controls: 1,
      fs: 0, // フルスクリーンボタンを非表示（横画面で自動対応するため）
    },
    events: {
      onReady: function (event) {
        event.target.playVideo();
      },
      onStateChange: function (event) {
        // 動画終了時に次の動画へ
        if (event.data === YT.PlayerState.ENDED) {
          if (currentIndex < VIDEOS.length - 1) {
            goToVideo(currentIndex + 1);
          }
        }
      },
    },
  });
}

// --- プレーヤー再構築 ---
function rebuildPlayer(index) {
  if (players[index]) {
    try {
      players[index].destroy();
    } catch (e) {}
    delete players[index];
  }
  const oldIframe = document.getElementById(`ytplayer-${index}`);
  if (oldIframe) oldIframe.remove();
  createPlayerForSlide(index);
}

// --- プレーヤー停止 ---
function pausePlayer(index) {
  if (players[index]) {
    try {
      players[index].pauseVideo();
    } catch (e) {}
  }
}

// --- 動画情報更新 ---
function updateVideoInfo(index) {
  const video = VIDEOS[index];
  document.getElementById('videoTitle').textContent = video.title;
  document.getElementById('videoDescription').textContent = video.description;
}

// --- ドットインジケーター更新 ---
function updateDots(index) {
  const dotsContainer = document.getElementById('swipeDots');
  dotsContainer.innerHTML = VIDEOS.map((_, i) =>
    `<div class="swipe-dot ${i === index ? 'active' : ''}"></div>`
  ).join('');
}

// --- 動画グリッド更新 ---
function updateVideoGrid(index) {
  const cards = document.querySelectorAll('.video-card');
  cards.forEach((card, i) => {
    card.classList.toggle('active', i === index);
    const badge = card.querySelector('.card-now-playing');
    if (i === index) {
      if (!badge) {
        const thumb = card.querySelector('.card-thumbnail');
        const span = document.createElement('span');
        span.className = 'card-now-playing';
        span.textContent = '再生中';
        thumb.appendChild(span);
      }
    } else {
      if (badge) badge.remove();
    }
  });
}

// --- 画面回転ハンドラ ---
function setupOrientationHandler() {
  const checkOrientation = () => {
    const wasLandscape = isLandscape;
    isLandscape = window.innerWidth > window.innerHeight;

    if (isLandscape && !wasLandscape) {
      enterLandscapeMode();
    } else if (!isLandscape && wasLandscape) {
      exitLandscapeMode();
    }
  };

  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', () => {
    setTimeout(checkOrientation, 100);
  });

  // 初期チェック
  checkOrientation();
}

// --- 横画面モード開始 ---
function enterLandscapeMode() {
  const overlay = document.getElementById('landscapeOverlay');
  updateLandscapeUI(currentIndex);

  // 一度オーバーレイを表示してから自動で隠す
  overlay.classList.add('visible');
  resetOverlayTimer();
}

// --- 横画面モード終了 ---
function exitLandscapeMode() {
  const overlay = document.getElementById('landscapeOverlay');
  overlay.classList.remove('visible');
  clearTimeout(overlayTimer);
}

// --- 横画面UI更新 ---
function updateLandscapeUI(index) {
  const video = VIDEOS[index];
  document.getElementById('landscapeTitle').textContent = video.title;
  document.getElementById('videoCounter').textContent = `${index + 1} / ${VIDEOS.length}`;

  // ボタン状態
  document.getElementById('prevBtn').style.visibility = index > 0 ? 'visible' : 'hidden';
  document.getElementById('nextBtn').style.visibility = index < VIDEOS.length - 1 ? 'visible' : 'hidden';
}

// --- 横画面コントロール ---
function setupLandscapeControls() {
  const overlay = document.getElementById('landscapeOverlay');
  const playerSection = document.getElementById('playerSection');

  // タップでオーバーレイ表示/非表示
  playerSection.addEventListener('click', (e) => {
    if (!isLandscape) return;
    // iframe内のクリックは検知できないので、wrapperエリアのみ
    if (e.target.closest('.video-frame-wrapper')) {
      toggleOverlay();
    }
  });

  // 前の動画ボタン
  document.getElementById('prevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      goToVideo(currentIndex - 1);
    }
    resetOverlayTimer();
  });

  // 次の動画ボタン
  document.getElementById('nextBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < VIDEOS.length - 1) {
      goToVideo(currentIndex + 1);
    }
    resetOverlayTimer();
  });

  // 戻るボタン（横画面時は画面ロック解除を促す的な意味で）
  document.getElementById('landscapeBackBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    // LIFFの場合はウィンドウを閉じる
    if (LIFF_ID && liff.isInClient()) {
      liff.closeWindow();
    }
  });
}

// --- オーバーレイ表示トグル ---
function toggleOverlay() {
  const overlay = document.getElementById('landscapeOverlay');
  if (overlay.classList.contains('visible')) {
    overlay.classList.remove('visible');
    clearTimeout(overlayTimer);
  } else {
    overlay.classList.add('visible');
    resetOverlayTimer();
  }
}

// --- オーバーレイ自動非表示タイマー ---
function resetOverlayTimer() {
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    const overlay = document.getElementById('landscapeOverlay');
    overlay.classList.remove('visible');
  }, 4000);
}
