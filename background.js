// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchDeskfyData') {
        handleFetch(request.payload, sendResponse);
        return true; // Mantém o canal de mensagem aberto para resposta assíncrona
    }
});

// Listener para mensagens vindas do site no GitHub Pages (externally_connectable)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchDeskfyData') {
        handleFetch(request.payload, sendResponse);
        return true;
    }
});

async function handleFetch(payload, sendResponse) {
    try {
        const { url, apiKey } = payload;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorMsg = `Erro na API: ${response.status} - ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) errorMsg = errorData.message;
            } catch(ex) {}
            
            sendResponse({ success: false, error: errorMsg, status: response.status });
            return;
        }

        const data = await response.json();
        sendResponse({ success: true, data });

    } catch (error) {
        console.error('Erro no background script:', error);
        sendResponse({ success: false, error: error.message });
    }
}
