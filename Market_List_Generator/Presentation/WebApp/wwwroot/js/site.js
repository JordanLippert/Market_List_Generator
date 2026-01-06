function getSelectedIds() {
  return Array.from(document.querySelectorAll('.item-select:checked')).map(i => parseInt(i.value, 10));
}

function updateCount() {
  const count = getSelectedIds().length;
  document.getElementById('count').textContent = count;
  document.getElementById('whatsappBtn').disabled = count === 0;
}

document.addEventListener('change', (e) => {
  if (e.target && e.target.classList.contains('item-select')) updateCount();
});

function selectAll() {
  document.querySelectorAll('.item-select').forEach(cb => cb.checked = true);
  updateCount();
}

function clearAll() {
  document.querySelectorAll('.item-select').forEach(cb => cb.checked = false);
  updateCount();
}

async function sendToWhatsApp() {
  const ids = getSelectedIds();
  if (ids.length === 0) return;
  try {
    const res = await fetch('/Home/GenerateWhatsAppLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids)
    });
    const data = await res.json();
    if (data && data.url) window.open(data.url, '_blank');
  } catch (e) { console.error(e); }
}

// Initial
updateCount();
