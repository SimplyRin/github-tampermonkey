# GitHub PR Approved Viewer - Chrome Extension

## ファイル構成

```
extension/
├── manifest.json   # Manifest V3 設定ファイル
├── content.js      # コンテンツスクリプト（メインロジック）
├── icons/
│   ├── icon.svg    # SVG アイコン（参考用）
│   ├── icon16.png  # ★ 要作成
│   ├── icon48.png  # ★ 要作成
│   └── icon128.png # ★ 要作成（Web Store 掲載アイコン）
└── README.md
```

## アイコンの準備

Chrome 拡張機能のアイコンは **PNG 形式** が必要です。  
`icons/icon.svg` を各サイズの PNG に変換して配置してください。

```bash
# Inkscape を使う場合
inkscape icons/icon.svg -w 16  -h 16  -o icons/icon16.png
inkscape icons/icon.svg -w 48  -h 48  -o icons/icon48.png
inkscape icons/icon.svg -w 128 -h 128 -o icons/icon128.png

# ImageMagick を使う場合
convert -background none icons/icon.svg -resize 16x16   icons/icon16.png
convert -background none icons/icon.svg -resize 48x48   icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png
```

## ローカルへの読み込み手順

1. Chrome を開き `chrome://extensions` にアクセス
2. 右上の「デベロッパーモード」を ON にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. この `extension/` フォルダを選択

## Chrome Web Store への公開手順

1. PNG アイコンを用意する（上記参照）
2. `extension/` フォルダを ZIP 圧縮する
3. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
4. 「新しいアイテム」→ ZIP ファイルをアップロード
5. ストア掲載情報（説明文・スクリーンショット等）を入力して申請

## 注意事項

- GitHub のセッションが必要です（ログイン済みの状態で使用してください）
- チームメンバーの取得には、Organization の Teams ページへのアクセス権限が必要です
