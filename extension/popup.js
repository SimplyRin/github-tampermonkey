// MIT License
// Copyright (c) 2026 SimplyRin

'use strict';

const DEFAULTS = {
    sortOrder: 'default',
    wildcardFirst: true
};

function loadSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get(DEFAULTS, resolve);
    });
}

function saveSettings(partial) {
    return new Promise(resolve => {
        chrome.storage.sync.set(partial, resolve);
    });
}

function showToast() {
    const toast = document.getElementById('savedToast');
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

async function init() {
    const settings = await loadSettings();

    // ── Sort rows ──────────────────────────────────────────────────
    const sortRows = document.querySelectorAll('.sort-row');

    function updateSortUI(value) {
        sortRows.forEach(row => {
            const check = row.querySelector('.row-check');
            if (row.dataset.value === value) {
                check.classList.add('selected');
            } else {
                check.classList.remove('selected');
            }
        });
    }

    updateSortUI(settings.sortOrder);

    sortRows.forEach(row => {
        row.addEventListener('click', async () => {
            const value = row.dataset.value;
            updateSortUI(value);
            await saveSettings({ sortOrder: value });
            showToast();
        });
    });

    // ── Wildcard first toggle ──────────────────────────────────────
    const wildcardToggle = document.getElementById('wildcardFirst');
    wildcardToggle.checked = settings.wildcardFirst;

    wildcardToggle.addEventListener('change', async () => {
        await saveSettings({ wildcardFirst: wildcardToggle.checked });
        showToast();
    });
}

init();
