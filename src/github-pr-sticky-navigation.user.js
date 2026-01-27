// ==UserScript==
// @name         GitHub PR Sticky Navigation
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  GitHub の Pull Request ページで、スクロール時に Conversation、Commits、Checks、Files changed のナビゲーションバーを固定表示する
// @author       SimplyRin
// @match        https://github.com/*/pull/*
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/SimplyRin/github-tampermonkey/main/src/github-pr-sticky-navigation.user.js
// @downloadURL  https://raw.githubusercontent.com/SimplyRin/github-tampermonkey/main/src/github-pr-sticky-navigation.user.js
// ==/UserScript==

(function() {
    'use strict';

    // スタイルを追加
    GM_addStyle(`
        /* クローンされたナビゲーションバーのスタイル */
        #sticky-pr-nav {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 999;
            background-color: var(--bgColor-default, var(--color-canvas-default));
            border-bottom: 1px solid var(--borderColor-default, var(--color-border-default));
            box-shadow: 0 1px 0 rgba(31,35,40,0.04), inset 0 -1px 0 var(--borderColor-muted, var(--color-border-muted));
            transition: top 0.1s ease-in-out;
        }

        #sticky-pr-nav.is-visible {
            display: block;
        }

        /* 従来の .tabnav スタイル (conversation/checks/files) */
        #sticky-pr-nav .tabnav {
            margin: 0;
            padding: 0;
            border: none;
        }

        #sticky-pr-nav .tabnav-tabs {
            border-bottom: none;
        }

        #sticky-pr-nav .tabnav-tab {
            padding: 8px 12px;
            line-height: 20px;
        }

        #sticky-pr-nav .tabnav-extra {
            padding-top: 8px;
            padding-bottom: 8px;
        }

        /* React ベースの新しいナビゲーションスタイル (commits) */
        #sticky-pr-nav nav[aria-label="Pull request navigation tabs"] {
        }

        #sticky-pr-nav .prc-TabNav-TabNavTabList-Ave63 {
            border-bottom: none;
        }

        #sticky-pr-nav .prc-TabNav-TabNavLink-u3umI {
            padding: 8px 12px;
            line-height: 20px;
        }

        #sticky-pr-nav .flex-auto {
        }

        /* sticky-header-backdropがis-stuckの時、クローンナビをその下に配置 */
        #sticky-header-backdrop.is-stuck ~ #sticky-pr-nav,
        #sticky-pr-nav.below-header {
            top: var(--sticky-header-height, 60px);
        }

        /* files-changed ページのレビューツールバー (.pr-toolbar) をナビゲーションバーの下に配置 */
        .pr-toolbar.js-toggle-stuck {
            top: var(--pr-nav-height, 48px) !important;
        }

        /* ナビゲーションバーとスティッキーヘッダーの両方がある場合 */
        html:has(#sticky-header-backdrop.is-stuck) .pr-toolbar.js-toggle-stuck {
            top: calc(var(--observed-header-height, 60px) + var(--pr-nav-height, 48px)) !important;
        }
    `);

    let stickyNav = null;
    let originalNav = null;
    let stickyHeaderBackdrop = null;
    let headerObserver = null;
    let scrollHandler = null;
    let currentPageType = null; // 'conversation', 'commits', 'checks', 'files'

    function detectPageType() {
        const path = window.location.pathname;
        if (path.includes('/commits')) {
            return 'commits';
        } else if (path.includes('/checks')) {
            return 'checks';
        } else if (path.includes('/files')) {
            return 'files';
        } else {
            return 'conversation';
        }
    }

    function findNavigationElement() {
        // ページタイプを検出
        currentPageType = detectPageType();

        // 1. conversation/checks/files ページ: 従来の .tabnav を探す
        // div.tabnav の中に nav.tabnav-tabs[aria-label="Pull request tabs"] がある
        let nav = document.querySelector('nav.tabnav-tabs[aria-label="Pull request tabs"]')?.closest('.tabnav');
        if (nav) {
            return nav;
        }

        // 2. commits ページ: React ベースの新しいナビゲーションを探す
        // nav.prc-TabNav-TabNavNav-MHmhC の親要素を探す
        nav = document.querySelector('nav[aria-label="Pull request navigation tabs"]');
        if (nav) {
            // 親の div.flex-auto を取得し、適切なコンテナを返す
            const container = nav.closest('.flex-auto');
            if (container) {
                return container;
            }
            return nav;
        }

        // 3. フォールバック: 古いセレクタを試す
        nav = document.querySelector('.pull-request-tab-content')?.previousElementSibling;
        if (nav && nav.classList.contains('tabnav')) {
            return nav;
        }

        nav = document.querySelector('#discussion_bucket')?.previousElementSibling;
        if (nav && nav.classList.contains('tabnav')) {
            return nav;
        }

        return null;
    }

    function init() {
        // 既存のクローンがあれば削除
        const existingNav = document.getElementById('sticky-pr-nav');
        if (existingNav) {
            existingNav.remove();
        }

        // オリジナルのナビゲーションを取得
        originalNav = findNavigationElement();

        if (!originalNav) {
            console.log('GitHub PR Sticky Nav: Navigation not found');
            return;
        }

        // sticky-header-backdropを取得
        stickyHeaderBackdrop = document.getElementById('sticky-header-backdrop');

        // クローンを作成
        stickyNav = document.createElement('div');
        stickyNav.id = 'sticky-pr-nav';
        stickyNav.innerHTML = originalNav.outerHTML;
        document.body.appendChild(stickyNav);

        // スクロールイベントとIntersectionObserverの設定
        setupScrollDetection();
        setupHeaderObserver();

        // 初期状態をチェック
        checkVisibility();
    }

    function setupScrollDetection() {
        // IntersectionObserverでオリジナルナビの表示状態を監視
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // オリジナルナビが画面外に出たら、クローンを表示
                if (!entry.isIntersecting) {
                    showStickyNav();
                } else {
                    hideStickyNav();
                }
            });
        }, {
            root: null,
            rootMargin: '-60px 0px 0px 0px', // ヘッダーの高さを考慮
            threshold: 0
        });

        observer.observe(originalNav);
    }

    function setupHeaderObserver() {
        // sticky-header-backdropのis-stuckクラスを監視
        if (stickyHeaderBackdrop) {
            headerObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'class') {
                        updateStickyNavPosition();
                    }
                });
            });

            headerObserver.observe(stickyHeaderBackdrop, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // commits ページの新しいスティッキーヘッダーも監視
        const newStickyHeader = document.querySelector('.use-sticky-header-module__stickyHeader--UQFpz');
        if (newStickyHeader) {
            // スクロールイベントで位置を更新
            const scrollHandler = () => {
                if (stickyNav?.classList.contains('is-visible')) {
                    updateStickyNavPosition();
                }
            };
            window.addEventListener('scroll', scrollHandler, { passive: true });
        }

        // ウィンドウリサイズ時に位置を更新
        window.addEventListener('resize', () => {
            if (stickyNav?.classList.contains('is-visible')) {
                updateStickyNavPosition();
            }
        }, { passive: true });
    }

    function showStickyNav() {
        if (stickyNav) {
            stickyNav.classList.add('is-visible');
            updateStickyNavPosition();
        }
    }

    function hideStickyNav() {
        if (stickyNav) {
            stickyNav.classList.remove('is-visible');
        }
    }

    function updateStickyNavPosition() {
        if (!stickyNav || !originalNav) return;

        // 元のナビゲーションの水平位置を取得して適用
        const originalRect = originalNav.getBoundingClientRect();
        stickyNav.style.paddingLeft = `${originalRect.left}px`;
        stickyNav.style.paddingRight = `${window.innerWidth - originalRect.right}px`;

        // ヘッダーが固定されているかどうかをチェック
        const isHeaderStuck = stickyHeaderBackdrop?.classList.contains('is-stuck');

        // commits ページの新しいスティッキーヘッダーをチェック
        const newStickyHeader = document.querySelector('.use-sticky-header-module__stickyHeader--UQFpz');
        const hasNewStickyHeader = newStickyHeader && newStickyHeader.getBoundingClientRect().top <= 0;

        if (isHeaderStuck || hasNewStickyHeader) {
            // ヘッダーの高さを取得して、その下に配置
            
            // 1. 新しいスティッキーヘッダー (commits ページ) を試す
            if (newStickyHeader && hasNewStickyHeader) {
                const headerRect = newStickyHeader.getBoundingClientRect();
                const headerBottom = headerRect.bottom;
                if (headerBottom > 0) {
                    stickyNav.style.top = `${headerBottom}px`;
                    stickyNav.classList.add('below-header');
                    return;
                }
            }

            // 2. 従来のヘッダー構造 (conversation/checks/files ページ) を試す
            const headerWrapper = document.getElementById('partial-discussion-header');
            if (headerWrapper) {
                const stickyHeader = headerWrapper.querySelector('.sticky-header-container');
                if (stickyHeader) {
                    const headerRect = stickyHeader.getBoundingClientRect();
                    const headerBottom = headerRect.bottom;
                    stickyNav.style.top = `${headerBottom}px`;
                    stickyNav.classList.add('below-header');
                    return;
                }
            }

            // フォールバック: CSSカスタムプロパティを使用
            const observedHeight = getComputedStyle(document.documentElement).getPropertyValue('--observed-header-height');
            if (observedHeight) {
                stickyNav.style.top = observedHeight;
            } else {
                stickyNav.style.top = '60px';
            }
            stickyNav.classList.add('below-header');
        } else {
            stickyNav.style.top = '0px';
            stickyNav.classList.remove('below-header');
        }
    }

    function checkVisibility() {
        if (!originalNav) return;

        const rect = originalNav.getBoundingClientRect();
        const headerHeight = 60; // 概算のヘッダー高さ

        if (rect.bottom < headerHeight) {
            showStickyNav();
        } else {
            hideStickyNav();
        }
    }

    // ページ読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Turbo/PJAXナビゲーション対応
    document.addEventListener('turbo:load', init);
    document.addEventListener('pjax:end', init);

    // URLの変更を監視（SPA対応）
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(init, 100);
        }
    }).observe(document, { subtree: true, childList: true });

})();
