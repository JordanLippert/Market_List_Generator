interface WhatsAppLinkResponse {
  url: string;
}

interface WhatsAppTarget {
  target: string;
  fallback: string;
  isMobile: boolean;
  isIOS: boolean;
}

function getSelectedIds(): number[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('.item-select:checked'))
    .map(i => parseInt(i.value, 10));
}

function updateCount(): void {
  const count = getSelectedIds().length;
  const countEl = document.getElementById('count');
  const btn = document.getElementById('whatsappBtn') as HTMLButtonElement | null;
  if (countEl) countEl.textContent = String(count);
  if (btn) btn.disabled = count === 0;
  updateCategoryCounters();
}

function updateCategoryCounters(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    const selected = card.querySelectorAll<HTMLInputElement>('.item-select:checked').length;
    const badge = card.querySelector<HTMLElement>('.card-count-n');
    if (badge) badge.textContent = String(selected);
  });
}

function selectAll(): void {
  document.querySelectorAll<HTMLInputElement>('.row:not(.is-hidden) .item-select')
    .forEach(cb => (cb.checked = true));
  updateCount();
}

function clearAll(): void {
  document.querySelectorAll<HTMLInputElement>('.item-select')
    .forEach(cb => (cb.checked = false));
  updateCount();
}

function filterItems(query: string): void {
  const q = query.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    let visible = 0;
    card.querySelectorAll<HTMLElement>('.row').forEach(row => {
      const label = row.querySelector<HTMLLabelElement>('label');
      const text = (label?.textContent ?? '').toLowerCase();
      const match = q === '' || text.includes(q);
      row.classList.toggle('is-hidden', !match);
      if (match) visible++;
    });
    card.classList.toggle('is-hidden', visible === 0);
  });
}

async function sendToWhatsApp(): Promise<void> {
  const ids = getSelectedIds();
  if (ids.length === 0) return;
  try {
    const res = await fetch('/Home/GenerateWhatsAppLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids)
    });
    const data = (await res.json()) as WhatsAppLinkResponse | null;
    if (!data || !data.url) return;

    const { target, fallback, isMobile, isIOS } = resolveWhatsAppUrl(data.url);

    if (isMobile) {
      window.location.href = target;
      const wait = isIOS ? 1500 : 900;
      setTimeout(() => {
        if (document.visibilityState === 'visible') window.location.href = fallback;
      }, wait);
    } else {
      const opened = window.open(target, '_blank');
      if (!opened) window.location.href = fallback;
    }
  } catch (e) {
    console.error(e);
  }
}

function resolveWhatsAppUrl(baseUrl: string): WhatsAppTarget {
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

function initBindings(): void {
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && t.classList.contains('item-select')) updateCount();
  });

  const search = document.getElementById('search') as HTMLInputElement | null;
  if (search) {
    search.addEventListener('input', () => filterItems(search.value));
  }

  const selBtn = document.getElementById('selectAllBtn');
  const clrBtn = document.getElementById('clearAllBtn');
  const waBtn = document.getElementById('whatsappBtn');
  if (selBtn) selBtn.addEventListener('click', selectAll);
  if (clrBtn) clrBtn.addEventListener('click', clearAll);
  if (waBtn) waBtn.addEventListener('click', sendToWhatsApp);

  updateCount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBindings);
} else {
  initBindings();
}
