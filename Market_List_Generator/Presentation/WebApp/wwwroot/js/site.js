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
      const { target, fallback, isMobile, isIOS } = resolveWhatsAppUrl(data.url);

      if (isMobile) {
        // Navegação no mesmo tab ajuda a evitar bloqueios de pop-up
        window.location.href = target;
        // iOS às vezes precisa de um tempo maior para detectar o app ausente
        const wait = isIOS ? 1500 : 900;
        setTimeout(() => {
          if (document.visibilityState === 'visible') window.location.href = fallback;
        }, wait);
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
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  // extrai o parâmetro text=... para montar deep link correto
  const match = baseUrl.match(/[?&]text=([^&]+)/);
  const text = match ? match[1] : '';

  const deepLink = `whatsapp://send?text=${text}`;
  const fallback = `https://wa.me/?text=${text}`; // fallback universal

  return { isMobile, isIOS, target: isMobile ? deepLink : fallback, fallback };
}
