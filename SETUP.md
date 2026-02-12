# 秋田ノーザンハピネッツ MOVIE GALLERY - セットアップガイド

## ローカル動作確認

```bash
cd LINEMovieGallery
npx serve -l 3000
```

ブラウザで http://localhost:3000 を開く

## LINE LIFF アプリとして公開する手順

### 1. LINE Developers コンソールで設定

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダーを選択（または新規作成）
3. **LINEログインチャネル** を新規作成
   - チャネル名: `秋田ノーザンハピネッツ MOVIE GALLERY`
   - チャネル説明: ムービーギャラリー
   - アプリタイプ: `ウェブアプリ`
4. チャネルを作成後、**LIFF** タブを開く
5. **LIFF アプリを追加** をクリック
   - サイズ: `Full`
   - エンドポイントURL: デプロイ先のURL（例: `https://your-domain.com`）
   - Scope: `openid`, `profile`
6. 作成されたLIFF IDをコピー

### 2. LIFF ID を設定

`js/app.js` の以下の行にLIFF IDを設定:

```javascript
const LIFF_ID = 'ここにLIFF IDを貼り付け';
```

### 3. デプロイ

#### Netlify（推奨・無料）
1. [Netlify](https://www.netlify.com/) にログイン
2. フォルダを直接ドラッグ＆ドロップでデプロイ
3. 自動で HTTPS URL が発行される
4. そのURLをLIFFのエンドポイントに設定

#### Vercel
```bash
npx vercel --prod
```

#### GitHub Pages
1. GitHubリポジトリにプッシュ
2. Settings > Pages > Source を main ブランチに設定

### 4. LINE公式アカウントとの連携

1. [LINE Official Account Manager](https://manager.line.biz/) にログイン
2. 秋田ノーザンハピネッツの公式アカウントを選択
3. リッチメニューを作成
   - メニュー項目に「MOVIE GALLERY」を追加
   - アクション: URLスキーム `https://liff.line.me/{LIFF_ID}`
4. または、メッセージにLIFF URLを送信して開く

## 動画の追加・変更

`js/app.js` の `VIDEOS` 配列を編集:

```javascript
const VIDEOS = [
  {
    id: 'YouTubeの動画ID',
    title: '動画タイトル',
    description: '動画の説明',
  },
  // ... 追加動画
];
```

YouTube動画IDはURLの `v=` パラメータ、または `youtu.be/` の後の文字列です。

## 技術スタック

- HTML / CSS / JavaScript（フレームワーク不要）
- Swiper.js（スワイプ機能）
- YouTube IFrame API（動画プレーヤー）
- LINE LIFF SDK（LINE連携）
