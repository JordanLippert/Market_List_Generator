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
    if (data && data.url) {
      const { target, fallback, isMobile } = resolveWhatsAppUrl(data.url);

      if (isMobile) {
        // Same-tab navigation avoids popup blockers on mobile browsers
        window.location.href = target;
        // If the app is not installed, fall back to the web URL
        setTimeout(() => {
          if (document.visibilityState === 'visible') window.location.href = fallback;
        }, 800);
      } else {
        const opened = window.open(target, '_blank');
        if (!opened) window.location.href = fallback;
      }
    }
  } catch (e) { console.error(e); }
}

// Initial
updateCount();

function resolveWhatsAppUrl(baseUrl) {
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  const deepLink = baseUrl.startsWith('https://api.whatsapp.com')
    ? baseUrl.replace('https://api.whatsapp.com', 'whatsapp')
    : baseUrl;

  return {
    isMobile,
    target: isMobile ? deepLink : baseUrl,
    fallback: baseUrl
  };
}
