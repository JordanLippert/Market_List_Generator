"use strict";
function getSelectedItems() {
    return Array.from(document.querySelectorAll('.item-select:checked'))
        .map(input => {
        const row = input.closest('.row');
        const label = row?.querySelector('.row-variation')?.dataset.variation ?? '';
        return {
            id: parseInt(input.value, 10),
            variationLabel: label === '' ? null : label
        };
    });
}
function updateCount() {
    const count = getSelectedItems().length;
    const countEl = document.getElementById('count');
    const btn = document.getElementById('whatsappBtn');
    if (countEl)
        countEl.textContent = String(count);
    if (btn)
        btn.disabled = count === 0;
    updateCategoryCounters();
}
function updateCategoryCounters() {
    document.querySelectorAll('.card').forEach(card => {
        const selected = card.querySelectorAll('.item-select:checked').length;
        const badge = card.querySelector('.card-count-n');
        if (badge)
            badge.textContent = String(selected);
    });
}
function readVariations(row) {
    const raw = row.dataset.variations ?? '[]';
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    }
    catch {
        return [];
    }
}
function selectAll() {
    document.querySelectorAll('.row:not(.is-hidden) .item-select')
        .forEach(cb => {
        if (cb.checked)
            return;
        const row = cb.closest('.row');
        if (!row)
            return;
        const variations = readVariations(row);
        if (variations.length > 0)
            return; // "Marcar visíveis" skips items that need a choice
        cb.checked = true;
    });
    updateCount();
}
function clearAll() {
    document.querySelectorAll('.item-select').forEach(cb => (cb.checked = false));
    document.querySelectorAll('.row-variation').forEach(el => {
        el.dataset.variation = '';
        el.textContent = '';
    });
    updateCount();
}
function filterItems(query) {
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        let visible = 0;
        card.querySelectorAll('.row').forEach(row => {
            const label = row.querySelector('label');
            const text = (label?.textContent ?? '').toLowerCase();
            const match = q === '' || text.includes(q);
            row.classList.toggle('is-hidden', !match);
            if (match)
                visible++;
        });
        card.classList.toggle('is-hidden', visible === 0);
    });
}
let dialogTarget = null;
function openVariationDialog(input, variations) {
    const dialog = document.getElementById('variationDialog');
    const chips = document.getElementById('variationChips');
    const itemEl = document.getElementById('variationDialogItem');
    const row = input.closest('.row');
    if (!dialog || !chips || !row)
        return;
    dialogTarget = input;
    if (itemEl)
        itemEl.textContent = row.querySelector('label')?.textContent ?? '';
    chips.innerHTML = '';
    variations.forEach(label => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'variation-chip';
        chip.textContent = label;
        chip.addEventListener('click', () => confirmVariation(label));
        chips.appendChild(chip);
    });
    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
    }
    else {
        dialog.setAttribute('open', '');
    }
}
function confirmVariation(label) {
    const dialog = document.getElementById('variationDialog');
    if (!dialogTarget || !dialog)
        return;
    const row = dialogTarget.closest('.row');
    const marker = row?.querySelector('.row-variation');
    if (marker) {
        marker.dataset.variation = label;
        marker.textContent = ` (${label})`;
    }
    dialogTarget.checked = true;
    dialog.close();
    dialogTarget = null;
    updateCount();
}
function cancelVariation() {
    const dialog = document.getElementById('variationDialog');
    if (!dialogTarget || !dialog)
        return;
    dialogTarget.checked = false;
    dialog.close();
    dialogTarget = null;
    updateCount();
}
function handleCheckboxChange(input) {
    const row = input.closest('.row');
    if (!row) {
        updateCount();
        return;
    }
    const variations = readVariations(row);
    if (input.checked && variations.length > 0) {
        input.checked = false; // wait for chip confirmation
        openVariationDialog(input, variations);
        return;
    }
    if (!input.checked) {
        const marker = row.querySelector('.row-variation');
        if (marker) {
            marker.dataset.variation = '';
            marker.textContent = '';
        }
    }
    updateCount();
}
async function sendToWhatsApp() {
    const selected = getSelectedItems();
    if (selected.length === 0)
        return;
    try {
        const res = await fetch('/Home/GenerateWhatsAppLink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selected)
        });
        const data = (await res.json());
        if (!data || !data.url)
            return;
        const { target, fallback, isMobile, isIOS } = resolveWhatsAppUrl(data.url);
        if (isMobile) {
            window.location.href = target;
            const wait = isIOS ? 1500 : 900;
            setTimeout(() => {
                if (document.visibilityState === 'visible')
                    window.location.href = fallback;
            }, wait);
        }
        else {
            const opened = window.open(target, '_blank');
            if (!opened)
                window.location.href = fallback;
        }
    }
    catch (e) {
        console.error(e);
    }
}
function resolveWhatsAppUrl(baseUrl) {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;
    const match = baseUrl.match(/[?&]text=([^&]+)/);
    const text = match ? match[1] : '';
    const deepLink = `whatsapp://send?text=${text}`;
    const fallback = `https://wa.me/?text=${text}`;
    return { isMobile, isIOS, target: isMobile ? deepLink : fallback, fallback };
}
function initBindings() {
    document.addEventListener('change', (e) => {
        const t = e.target;
        if (t && t.classList.contains('item-select'))
            handleCheckboxChange(t);
    });
    const search = document.getElementById('search');
    if (search)
        search.addEventListener('input', () => filterItems(search.value));
    const selBtn = document.getElementById('selectAllBtn');
    const clrBtn = document.getElementById('clearAllBtn');
    const waBtn = document.getElementById('whatsappBtn');
    const cancelBtn = document.getElementById('variationCancel');
    if (selBtn)
        selBtn.addEventListener('click', selectAll);
    if (clrBtn)
        clrBtn.addEventListener('click', clearAll);
    if (waBtn)
        waBtn.addEventListener('click', sendToWhatsApp);
    if (cancelBtn)
        cancelBtn.addEventListener('click', cancelVariation);
    updateCount();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBindings);
}
else {
    initBindings();
}
