document.getElementById('extract-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const apiKey = document.getElementById('apiKey').value.trim();
    let initialDate = document.getElementById('initialDate').value;
    let endDate = document.getElementById('endDate').value;
    
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('spinner');
    const btnText = submitBtn.querySelector('span');
    const statusMsg = document.getElementById('statusMessage');
    
    // Formatar datas para o padrão da API ou remover se vazias
    // (Padrão esperado costuma ser YYYY-MM-DD ou UTC, mas os inputs type="date" já enviam YYYY-MM-DD)
    
    // Reset UI
    submitBtn.disabled = true;
    spinner.style.display = 'block';
    btnText.style.display = 'none';
    statusMsg.className = 'status-message';
    statusMsg.textContent = '';
    
    try {
        const payload = { apiKey };
        if (initialDate) payload.initialDate = initialDate;
        if (endDate) payload.endDate = endDate;
        
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            let errorMessage = 'Erro ao exportar tarefas.';
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // If the response wasn't JSON, we just use the default errorMessage
            }
            throw new Error(errorMessage);
        }
        
        // Handle Blob download directly in memory without saving on the server
        const blob = await response.blob();
        
        // Verifica se houve retorno
        if (blob.size === 0) {
            throw new Error('O arquivo retornado está vazio. Nenhuma tarefa encontrada.');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Pega o nome do arquivo se vier no header Content-Disposition
        const disposition = response.headers.get('content-disposition');
        let filename = 'tarefas_deskfy.csv';
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename="([^"]+)"/.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1];
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup resources
        setTimeout(() => {
            a.remove();
            window.URL.revokeObjectURL(url);
        }, 100);
        
        statusMsg.textContent = 'Arquivo exportado com sucesso!';
        statusMsg.classList.add('success');
        
    } catch (error) {
        statusMsg.textContent = error.message;
        statusMsg.classList.add('error');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'block';
        setTimeout(() => {
            spinner.style.display = 'none';
            btnText.style.display = 'inline';
        }, 300); // small delay to make ui look smooth
    }
});
