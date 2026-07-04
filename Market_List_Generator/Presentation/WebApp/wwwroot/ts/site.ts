interface WhatsAppLinkResponse {
  url: string;
}

interface WhatsAppTarget {
  target: string;
  fallback: string;
  isMobile: boolean;
  isIOS: boolean;
}

interface SelectedItem {
  id: number;
  variationLabel: string | null;
}

function getSelectedItems(): SelectedItem[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('.item-select:checked'))
    .map(input => {
      const row = input.closest('.row') as HTMLElement | null;
      const label = row?.querySelector<HTMLElement>('.row-variation')?.dataset.variation ?? '';
      return {
        id: parseInt(input.value, 10),
        variationLabel: label === '' ? null : label
      };
    });
}

function updateCount(): void {
  const count = getSelectedItems().length;
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

function readVariations(row: HTMLElement): string[] {
  const raw = row.dataset.variations ?? '[]';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function selectAll(): void {
  document.querySelectorAll<HTMLInputElement>('.row:not(.is-hidden) .item-select')
    .forEach(cb => {
      if (cb.checked) return;
      const row = cb.closest('.row') as HTMLElement | null;
      if (!row) return;
      const variations = readVariations(row);
      if (variations.length > 0) return; // "Marcar visíveis" skips items that need a choice
      cb.checked = true;
    });
  updateCount();
}

function clearAll(): void {
  document.querySelectorAll<HTMLInputElement>('.item-select').forEach(cb => (cb.checked = false));
  document.querySelectorAll<HTMLElement>('.row-variation').forEach(el => {
    el.dataset.variation = '';
    el.textContent = '';
  });
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

let dialogTarget: HTMLInputElement | null = null;

function openVariationDialog(input: HTMLInputElement, variations: string[]): void {
  const dialog = document.getElementById('variationDialog') as HTMLDialogElement | null;
  const chips = document.getElementById('variationChips');
  const itemEl = document.getElementById('variationDialogItem');
  const row = input.closest('.row') as HTMLElement | null;
  if (!dialog || !chips || !row) return;

  dialogTarget = input;
  if (itemEl) itemEl.textContent = row.querySelector('label')?.textContent ?? '';

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
  } else {
    dialog.setAttribute('open', '');
  }
}

function confirmVariation(label: string): void {
  const dialog = document.getElementById('variationDialog') as HTMLDialogElement | null;
  if (!dialogTarget || !dialog) return;

  const row = dialogTarget.closest('.row') as HTMLElement | null;
  const marker = row?.querySelector<HTMLElement>('.row-variation');
  if (marker) {
    marker.dataset.variation = label;
    marker.textContent = ` (${label})`;
  }
  dialogTarget.checked = true;
  dialog.close();
  dialogTarget = null;
  updateCount();
}

function cancelVariation(): void {
  const dialog = document.getElementById('variationDialog') as HTMLDialogElement | null;
  if (!dialogTarget || !dialog) return;
  dialogTarget.checked = false;
  dialog.close();
  dialogTarget = null;
  updateCount();
}

function handleCheckboxChange(input: HTMLInputElement): void {
  const row = input.closest('.row') as HTMLElement | null;
  if (!row) { updateCount(); return; }

  const variations = readVariations(row);
  if (input.checked && variations.length > 0) {
    input.checked = false; // wait for chip confirmation
    openVariationDialog(input, variations);
    return;
  }

  if (!input.checked) {
    const marker = row.querySelector<HTMLElement>('.row-variation');
    if (marker) { marker.dataset.variation = ''; marker.textContent = ''; }
  }
  updateCount();
}

async function sendToWhatsApp(): Promise<void> {
  const selected = getSelectedItems();
  if (selected.length === 0) return;
  try {
    const res = await fetch('/Home/GenerateWhatsAppLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected)
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
    if (t && t.classList.contains('item-select')) handleCheckboxChange(t as HTMLInputElement);
  });

  const search = document.getElementById('search') as HTMLInputElement | null;
  if (search) search.addEventListener('input', () => filterItems(search.value));

  const selBtn = document.getElementById('selectAllBtn');
  const clrBtn = document.getElementById('clearAllBtn');
  const waBtn = document.getElementById('whatsappBtn');
  const cancelBtn = document.getElementById('variationCancel');
  if (selBtn) selBtn.addEventListener('click', selectAll);
  if (clrBtn) clrBtn.addEventListener('click', clearAll);
  if (waBtn) waBtn.addEventListener('click', sendToWhatsApp);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelVariation);

  updateCount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBindings);
} else {
  initBindings();
}
