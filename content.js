// content.js
// Esse script roda no contexto do GitHub Pages e faz a ponte com o Background Script da extensão.

window.addEventListener('message', (event) => {
    // Apenas mensagens originadas na nossa própria janela
    if (event.source !== window || !event.data || event.data.type !== 'DESKFY_API_REQUEST') return;

    const { payload, requestId } = event.data;

    try {
        chrome.runtime.sendMessage({
            action: 'fetchDeskfyData',
            payload
        }, (response) => {
            // Devolver a resposta para a página principal
            window.postMessage({
                type: 'DESKFY_API_RESPONSE',
                requestId,
                response
            }, '*');
        });
    } catch (e) {
        window.postMessage({
            type: 'DESKFY_API_RESPONSE',
            requestId,
            response: { success: false, error: "Extensão desconectada ou erro interno: " + e.message }
        }, '*');
    }
});

// Notificar a página que o Content Script da extensão está carregado
window.postMessage({ type: 'DESKFY_EXTENSION_READY' }, '*');
