# github-tampermonkey

GitHub のページを改良する [Tampermonkey](https://www.tampermonkey.net/) ユーザースクリプト集です。

## インストール

1. お使いのブラウザに Tampermonkey 拡張機能をインストールします
   - [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
2. 各スクリプトの **Install** リンクをクリックしてインストールします

---

## スクリプト一覧

### GitHub PR Approved Viewer

[![Install](https://img.shields.io/badge/Install-Tampermonkey-blue)](https://raw.githubusercontent.com/SimplyRin/github-tampermonkey/main/src/github-pr-approved-viewer.user.js)

Pull Request ページに **Code Owner の承認状況** を表示します。

- リポジトリの `.github/CODEOWNERS` を自動取得
- 変更されたファイルに対応するコードオーナーを表示
- 誰が承認済みかをアバターで一覧表示
- 全オーナーが承認済みかどうかをヘッダーで確認可能

---

### GitHub PR Sticky Navigation

[![Install](https://img.shields.io/badge/Install-Tampermonkey-blue)](https://raw.githubusercontent.com/SimplyRin/github-tampermonkey/main/src/github-pr-sticky-navigation.user.js)

Pull Request ページで **ナビゲーションバーをスクロール時に固定表示** します。

- Conversation / Commits / Checks / Files changed タブが常に画面上部に表示
- 長い PR のレビュー時にタブ切り替えがスムーズになります
