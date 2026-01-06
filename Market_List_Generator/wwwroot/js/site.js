function updateCount() {
    const checkboxes = document.querySelectorAll('.item-select:checked');
    const count = checkboxes.length;
    document.getElementById('count').textContent = count;
    document.getElementById('whatsappBtn').disabled = count === 0;
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.item-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateCount);
    });
});

function selectAll() {
    document.querySelectorAll('.item-select').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateCount();
}

function clearAll() {
    document.querySelectorAll('.item-select').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateCount();
}

async function sendToWhatsApp() {
    const selectedIds = Array.from(document.querySelectorAll('.item-select:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
        alert('Selecione pelo menos um item!');
        return;
    }

    try {
        const response = await fetch('/Home/GenerateWhatsAppLink', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(selectedIds)
        });

        const data = await response.json();
        window.open(data.url, '_blank');
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao gerar link do WhatsApp. Tente novamente.');
    }
}
