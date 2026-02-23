// ==UserScript==
// @name         GitHub PR Approved Viewer
// @namespace    http://tampermonkey.net/
// @version      2026-02-22
// @description  try to take over the world!
// @author       @SimplyRin
// @match        https://github.com/*
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        none
// @updateURL    https://raw.githubusercontent.com/SimplyRin/github-tampermonkey/main/src/github-pr-approved-viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/SimplyRin/github-tampermonkey/main/src/github-pr-approved-viewer.user.js
// ==/UserScript==

const CODEOWNERS = "https://github.com/SimplyRin/test-codeowners/blob/main/.github/CODEOWNERS";

(function () {
    'use strict';

    function isPRPage() {
        const path = window.location.pathname;
        // /owner/repo/pull/number の形式をチェック
        const match = path.match(/^\/[^/]+\/[^/]+\/pull\/\d+\/?$/);
        return match !== null;
    }

    async function getUrl(url) {
        const res = await fetch(url);
        const html = await res.text();

        const div = document.createElement('div');
        div.hidden = true;
        div.innerHTML = html;

        document.body.appendChild(div);

        return div;
    }

    //
    // CODEOWNER 取得
    //
    async function getCodeOwners() {
        try {
            const div = await getUrl(CODEOWNERS);

            let codeowner = document.querySelector("#copilot-button-positioner > div.CodeBlob-module__codeBlobInner__tfjuQ > div > div.react-code-lines").innerText;

            div.remove();

            return codeowner;
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    async function getFilesChanged() {
        const div = await getUrl(`${window.location.href}/changes`);

        const elements = document.getElementsByClassName("Diff-module__diffHeaderWrapper__UgUyv");

        const list = [];

        for (let i = 0; i < elements.length; i++) {
            const code = elements[i].querySelector("h3 code");
            if (code) {
                list.push(code.textContent.trim());
                console.log(`diff[${i}]: ${code.textContent.trim()}`);
            }
        }

        div.remove();

        return list;
    }

    function cleanFileName(name) {
        return name.replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
    }

    function findCodeOwners(codeownersText, changedFiles) {
        const rules = codeownersText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(line => {
                const parts = line.split(/\s+/);
                const pattern = parts[0];
                const owners = parts.slice(1);
                return { pattern, owners };
            });

        const result = [];

        for (let file of changedFiles) {
            file = cleanFileName(file);

            let matchedOwners = [];
            let matchedPattern = null;

            for (const rule of rules) {

                const regex = patternToRegex(rule.pattern);

                if (regex.test(file)) {
                    matchedOwners = rule.owners;
                    matchedPattern = rule.pattern;
                }
            }

            result.push({
                file: file,
                codeowner: matchedPattern,
                owners: matchedOwners
            });
        }

        return result;
    }

    function patternToRegex(pattern) {
        let regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');

        if (pattern.endsWith('/')) {
            regex = '^' + regex + '.*';
        } else {
            regex = '^' + regex + '$';
        }

        return new RegExp(regex);
    }

    function ensureSkeletonStyles() {
        if (document.getElementById('codeowner-skeleton-styles')) return;
        const style = document.createElement('style');
        style.id = 'codeowner-skeleton-styles';
        style.textContent = `
@keyframes codeowner-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
}
.codeowner-skel {
    background-color: var(--bgColor-neutral-muted, rgba(175,184,193,0.2));
    border-radius: 6px;
    animation: codeowner-pulse 1.5s ease-in-out infinite;
    display: inline-block;
}
`;
        document.head.appendChild(style);
    }

    function insertSkeletonSection() {
        ensureSkeletonStyles();

        const reviewRequired = document.querySelector('section[aria-label="Reviews"]');
        if (!reviewRequired) return;

        const existing = document.querySelector('section[aria-label="Code owner approval status"]');
        if (existing) existing.remove();

        const container = document.createElement('section');
        container.setAttribute('aria-label', 'Code owner approval status');
        container.setAttribute('data-codeowner-loading', 'true');
        container.className = 'border-bottom color-border-subtle';

        container.innerHTML = `
<div class="MergeBoxSectionHeader-module__wrapper___70DU MergeBoxSectionHeader-module__wrapperCanExpand__iicCN">
    <div class="d-flex width-full">
        <div class="mr-2 flex-shrink-0">
            <div style="overflow: hidden; border-width: 0px; border-radius: 50%; border-style: solid; border-color: var(--borderColor-default); width: 32px; height: 32px;">
                <span class="codeowner-skel" style="display:block;width:32px;height:32px;border-radius:50%;"></span>
            </div>
        </div>
        <div class="d-flex flex-1 flex-column flex-sm-row gap-2">
            <div class="flex-1">
                <h3 class="MergeBoxSectionHeader-module__MergeBoxSectionHeading__Kr_f8 prc-Heading-Heading-MtWFE">Code owner review</h3>
                <span class="codeowner-skel" style="display:inline-block;height:12px;width:220px;margin-top:4px;"></span>
            </div>
        </div>
    </div>
</div>
<div>
    <div class="d-flex flex-items-center p-2 border-top borderColor-muted" style="gap: 0;">
        <div style="width: 24px; flex-shrink: 0;"></div>
        <div class="text-small text-bold fgColor-muted" style="flex: 2; padding-left: 8px;">File</div>
        <div class="text-small text-bold fgColor-muted" style="flex: 1;">Code Owners</div>
        <div class="text-small text-bold fgColor-muted" style="flex: 1;">Approved by</div>
    </div>
    <div class="d-flex flex-items-center p-2 border-top borderColor-muted" style="gap: 0;">
        <div style="width: 24px; flex-shrink: 0;">
            <span class="codeowner-skel" style="display:block;width:16px;height:16px;border-radius:50%;"></span>
        </div>
        <div style="flex: 2; padding-left: 8px; display:flex; flex-direction:column; gap:4px;">
            <span class="codeowner-skel" style="height:12px;width:80px;"></span>
            <span class="codeowner-skel" style="height:10px;width:200px;"></span>
        </div>
        <div style="flex: 1;">
            <span class="codeowner-skel" style="height:20px;width:20px;border-radius:50%;display:inline-block;"></span>
        </div>
        <div style="flex: 1;">
            <span class="codeowner-skel" style="height:12px;width:40px;"></span>
        </div>
    </div>
    <div class="d-flex flex-items-center p-2 border-top borderColor-muted" style="gap: 0;">
        <div style="width: 24px; flex-shrink: 0;">
            <span class="codeowner-skel" style="display:block;width:16px;height:16px;border-radius:50%;"></span>
        </div>
        <div style="flex: 2; padding-left: 8px; display:flex; flex-direction:column; gap:4px;">
            <span class="codeowner-skel" style="height:12px;width:120px;"></span>
            <span class="codeowner-skel" style="height:10px;width:160px;"></span>
        </div>
        <div style="flex: 1;">
            <span class="codeowner-skel" style="height:20px;width:20px;border-radius:50%;display:inline-block;"></span>
        </div>
        <div style="flex: 1;">
            <span class="codeowner-skel" style="height:12px;width:40px;"></span>
        </div>
    </div>
</div>
`;

        reviewRequired.after(container);
    }

    function insertCodeOwnerSection(result) {

        // スケルトンまたは既存のセクションを削除
        const existingSection = document.querySelector('section[aria-label="Code owner approval status"]');
        if (existingSection) existingSection.remove();

        const approvedList = getApprovedList();

        const reviewRequired = document.querySelector(
            'section[aria-label="Reviews"]'
        );

        if (!reviewRequired) return;

        const allApproved = result.length > 0 && result.every(row => {
            return row.owners && row.owners.length > 0 && row.owners.some(owner => {
                const username = owner.replace('@', '');
                return approvedList[username] === true;
            });
        });

        const headerIconBg = allApproved
            ? 'var(--bgColor-success-emphasis)'
            : 'var(--bgColor-attention-emphasis)';

        const headerIcon = allApproved
            ? `<svg aria-hidden="true" focusable="false" class="octicon octicon-check" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom; color: var(--fgColor-onEmphasis);"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0L2.22 7.28a.75.75 0 1 1 1.06-1.06L7 9.94l5.72-5.72a.75.75 0 0 1 1.06 0Z"></path></svg>`
            : `<svg aria-hidden="true" focusable="false" class="octicon octicon-dot-fill" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom; color: var(--fgColor-onEmphasis);"><path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"></path></svg>`;

        const sectionId = 'codeowner-expandable-' + Date.now();

        const container = document.createElement("section");
        container.setAttribute("aria-label", "Code owner approval status");
        container.className = "border-bottom color-border-subtle";

        container.innerHTML = `
<div class="MergeBoxSectionHeader-module__wrapper___70DU MergeBoxSectionHeader-module__wrapperCanExpand__iicCN">
    <div class="d-flex width-full">
        <div class="mr-2 flex-shrink-0">
            <div style="overflow: hidden; border-width: 0px; border-radius: 50%; border-style: solid; border-color: var(--borderColor-default); width: 32px; height: 32px;">
                <div style="display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; background-color: ${headerIconBg};">
                    ${headerIcon}
                </div>
            </div>
        </div>
        <div class="d-flex flex-1 flex-column flex-sm-row gap-2">
            <div class="flex-1">
                <h3 class="MergeBoxSectionHeader-module__MergeBoxSectionHeading__Kr_f8 prc-Heading-Heading-MtWFE">Code owner review</h3>
                <p class="fgColor-muted mb-0">${allApproved ? 'All code owners have approved.' : 'Code owner review required.'}</p>
            </div>
        </div>
    </div>
    <button aria-label="Code owner review" type="button" class="MergeBoxSectionHeader-module__button__R1r_x" aria-expanded="true" aria-controls="${sectionId}"></button>
    <div class="fgColor-muted pr-2 pt-2">
        <div style="transition: transform 0.15s ease-in-out;">
            <svg aria-hidden="true" focusable="false" class="octicon octicon-chevron-up" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M3.22 10.53a.749.749 0 0 1 0-1.06l4.25-4.25a.749.749 0 0 1 1.06 0l4.25 4.25a.749.749 1 1 1-1.06 1.06L8 6.811 4.28 10.53a.749.749 0 0 1-1.06 0Z"></path></svg>
        </div>
    </div>
</div>
<div id="${sectionId}" class="MergeBoxExpandable-module__expandableWrapper__IcZEm MergeBoxExpandable-module__isExpanded__WZlhA" style="visibility: visible;">
    <div class="MergeBoxExpandable-module__expandableContent__xCBlh MergeBoxExpandable-module__isExpanded__WZlhA">
        <div class="ReviewerSection-module__reviewerGroupsContainer__it7zd">
            <div class="d-flex flex-items-center p-2 border-top borderColor-muted" style="gap: 0;">
                <div style="width: 24px; flex-shrink: 0;"></div>
                <div class="text-small text-bold fgColor-muted" style="flex: 2; padding-left: 8px;">File</div>
                <div class="text-small text-bold fgColor-muted" style="flex: 1;">Code Owners</div>
                <div class="text-small text-bold fgColor-muted" style="flex: 1;">Approved by</div>
            </div>
            ${result.map(row => {
                const rowApproved = row.owners && row.owners.some(owner => {
                    const username = owner.replace('@', '');
                    return approvedList[username] === true;
                });
                const approvedOwners = (row.owners || []).filter(owner => {
                    const username = owner.replace('@', '');
                    return approvedList[username] === true;
                });
                return `
                <div class="d-flex flex-items-center p-2 border-top borderColor-muted" style="gap: 0;">
                    <div style="width: 24px; flex-shrink: 0;">
                        ${rowApproved ? iconApproved() : iconPending()}
                    </div>
                    <div style="flex: 2; padding-left: 8px;">
                        <div class="text-bold text-small">${row.codeowner || '(no match)'}</div>
                        <div class="text-small fgColor-muted">${row.file}</div>
                    </div>
                    <div style="flex: 1; display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                        ${(row.owners || []).map(owner => avatar(owner)).join('')}
                    </div>
                    <div style="flex: 1; display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                        ${approvedOwners.length > 0
                            ? approvedOwners.map(owner => avatar(owner)).join('')
                            : '<span class="text-small fgColor-muted">-</span>'
                        }
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
</div>
`;

        reviewRequired.after(container);

        // 折り畳みボタンの動作
        const toggleBtn = container.querySelector('.MergeBoxSectionHeader-module__button__R1r_x');
        const expandable = container.querySelector(`#${sectionId}`);
        const chevron = container.querySelector('.fgColor-muted.pr-2.pt-2 > div');

        toggleBtn.addEventListener('click', () => {
            const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                toggleBtn.setAttribute('aria-expanded', 'false');
                expandable.classList.remove('MergeBoxExpandable-module__isExpanded__WZlhA');
                expandable.style.visibility = 'hidden';
                chevron.style.transform = 'rotate(180deg)';
            } else {
                toggleBtn.setAttribute('aria-expanded', 'true');
                expandable.classList.add('MergeBoxExpandable-module__isExpanded__WZlhA');
                expandable.style.visibility = 'visible';
                chevron.style.transform = '';
            }
        });

    }

    function iconApproved() {

        return `
<svg class="octicon octicon-check color-fg-success" width="16" height="16">
<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0L2.22 7.28a.75.75 0 1 1 1.06-1.06L7 9.94l5.72-5.72a.75.75 0 0 1 1.06 0Z"></path>
</svg>
`;

    }


    function iconPending() {

        return `
<svg class="octicon octicon-dot-fill color-fg-attention" width="16" height="16">
<path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"></path>
</svg>
`;

    }

    function avatar(user) {

        const u = user.replace('@', '');

        return `
<a
href="https://github.com/${u}"
data-hovercard-type="user"
data-hovercard-url="/users/${u}/hovercard"
style="display:inline-block;line-height:0;"
tabindex="-1">
<img
src="https://github.com/${u}.png"
alt="${user}"
width="20"
height="20"
class="avatar circle">
</a>
`;

    }

    function getApprovedList() {
        const results = {};
        const reviewerRows = document.querySelectorAll('form.js-issue-sidebar-form p.d-flex');

        reviewerRows.forEach(row => {
            const nameEl = row.querySelector('span[data-assignee-name]');
            if (!nameEl) return;

            const userName = nameEl.dataset.assigneeName;

            const isApproved = row.querySelector('svg.octicon-check.color-fg-success') !== null;

            results[userName] = isApproved;
        });

        return results;
    }

    async function main() {
        if (!isPRPage()) {
            return;
        }

        const gen = _generation;

        const codeowner = await getCodeOwners();
        if (gen !== _generation) return;

        console.log(`location: ${window.location.href}`);
        const changed = await getFilesChanged();
        if (gen !== _generation) return;

        console.log(`codeowner: ${codeowner}`);
        console.log(`changed: ${changed}`);

        const codeowners = findCodeOwners(codeowner, changed);

        console.log(`result: ${JSON.stringify(codeowners, null, 2)}`);

        const approvedList = getApprovedList();

        console.log(`approvedList: ${JSON.stringify(approvedList, null, 2)}`);

        insertCodeOwnerSection(codeowners);
    }

    // ページ遷移・SPA ナビゲーションの管理
    let _lastUrl = null;
    let _generation = 0;
    let _navTimer = null;
    let _reviewObserver = null;

    // Reviews セクションの出現を監視し、スケルトンを即時挿入してデータ取得を開始する
    function watchForPRContent() {
        if (_reviewObserver) {
            _reviewObserver.disconnect();
            _reviewObserver = null;
        }

        if (!isPRPage()) return;

        function tryInit() {
            if (document.querySelector('section[aria-label="Reviews"]')) {
                insertSkeletonSection();
                main();
                return true;
            }
            return false;
        }

        if (!tryInit()) {
            _reviewObserver = new MutationObserver(() => {
                if (tryInit()) {
                    _reviewObserver.disconnect();
                    _reviewObserver = null;
                }
            });
            _reviewObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function onUrlChange() {
        const url = window.location.href;
        if (url === _lastUrl) return;
        _lastUrl = url;
        _generation++;

        // 古いセクションを削除
        const existing = document.querySelector('section[aria-label="Code owner approval status"]');
        if (existing) existing.remove();

        watchForPRContent();
    }

    function scheduleNavCheck() {
        if (_navTimer) clearTimeout(_navTimer);
        _navTimer = setTimeout(() => {
            _navTimer = null;
            onUrlChange();
        }, 200);
    }

    // 初期実行
    scheduleNavCheck();

    // ページ遷移を検出（SPA対応）
    window.addEventListener('popstate', scheduleNavCheck);

    // History API による遷移も検出
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
        originalPushState.apply(window.history, args);
        scheduleNavCheck();
    };

    window.history.replaceState = function(...args) {
        originalReplaceState.apply(window.history, args);
        scheduleNavCheck();
    };

})();
