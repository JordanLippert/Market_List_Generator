"use strict";
function getSelectedIds() {
    return Array.from(document.querySelectorAll('.item-select:checked'))
        .map(i => parseInt(i.value, 10));
}
function updateCount() {
    const count = getSelectedIds().length;
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
function selectAll() {
    document.querySelectorAll('.row:not(.is-hidden) .item-select')
        .forEach(cb => (cb.checked = true));
    updateCount();
}
function clearAll() {
    document.querySelectorAll('.item-select')
        .forEach(cb => (cb.checked = false));
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
async function sendToWhatsApp() {
    const ids = getSelectedIds();
    if (ids.length === 0)
        return;
    try {
        const res = await fetch('/Home/GenerateWhatsAppLink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
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
            updateCount();
    });
    const search = document.getElementById('search');
    if (search) {
        search.addEventListener('input', () => filterItems(search.value));
    }
    const selBtn = document.getElementById('selectAllBtn');
    const clrBtn = document.getElementById('clearAllBtn');
    const waBtn = document.getElementById('whatsappBtn');
    if (selBtn)
        selBtn.addEventListener('click', selectAll);
    if (clrBtn)
        clrBtn.addEventListener('click', clearAll);
    if (waBtn)
        waBtn.addEventListener('click', sendToWhatsApp);
    updateCount();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBindings);
}
else {
    initBindings();
}
