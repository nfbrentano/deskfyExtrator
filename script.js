// script.js
document.getElementById('extract-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const apiKey = document.getElementById('apiKey').value.trim();
    let initialDate = document.getElementById('initialDate').value;
    let endDate = document.getElementById('endDate').value;
    
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('spinner');
    const btnText = submitBtn.querySelector('span');
    const statusMsg = document.getElementById('statusMessage');
    
    // Reset UI
    submitBtn.disabled = true;
    spinner.style.display = 'block';
    btnText.style.display = 'none';
    statusMsg.className = 'status-message';
    statusMsg.textContent = '';
    
    try {
        let url = 'https://service-api.deskfy.io/v1/reports/workflow';
        const params = [];
        if (initialDate) params.push(`initialDate=${initialDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        // Fazer requisição diretamente para a API do Deskfy
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
            
            if (response.status === 401 || response.status === 403) {
                throw new Error("API Key inválida ou sem permissão.");
            } else {
                throw new Error("A API Deskfy bloqueou a requisição (" + errorMsg + ").");
            }
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Nenhuma solicitação encontrada ou a API bloqueou a resposta.');
        }

        // --- Processar JSON para CSV ---
        const processed = [];
        const formFieldsSet = new Set();
        
        for (const item of data) {
            const sol = item.solicitacao || {};
            const solicitante = item.solicitante || {};
            
            let responsaveis = '';
            if (Array.isArray(item.responsaveis)) {
                responsaveis = item.responsaveis.map(r => r.name).join(', ');
            }
            
            let anexos = '';
            if (Array.isArray(item.anexos)) {
                anexos = item.anexos.map(a => a.publicUrl || a.name).join(', ');
            }
            
            const rowObject = {
                'ID': sol.id || '',
                'Código': sol.codigo || '',
                'Título': sol.titulo || '',
                'Status': sol.status || '',
                'Dt. Cadastro': sol.dt_cadastro || '',
                'Prev. Entrega': sol.dt_preventrega || '',
                'Dt. Entrega': sol.dt_entrega || '',
                'Prioridade': sol.prioridade || '',
                'Tipo': sol.tipo || '',
                'Board': sol.board || '',
                'Coluna Atual': sol.colunaatual || '',
                'Ajustes': sol.ajustes !== undefined ? sol.ajustes : '',
                'Formulário': sol.formulario || '',
                'Solicitante Nome': solicitante.name || '',
                'Solicitante Email': solicitante.email || '',
                'Solicitante Perfil': solicitante.perfil || '',
                'Responsáveis': responsaveis,
                'Anexos': anexos
            };
            
            // Formulários dinâmicos
            if (Array.isArray(item.resp_formulario)) {
                for (const rf of item.resp_formulario) {
                    const fieldName = rf.campo_nome ? `[Form] ${rf.campo_nome}` : null;
                    if (fieldName) {
                        formFieldsSet.add(fieldName);
                        let val = rf.resposta;
                        // Formulários file upload formata arrays de arq
                        if (rf.campo_tipo === 'ATTACHMENT' && Array.isArray(rf.arquivos)) {
                            val = rf.arquivos.map(ar => ar.publicUrl || ar.name).join(', ');
                        }
                        rowObject[fieldName] = val;
                    }
                }
            }
            processed.push(rowObject);
        }

        // Helpers CSV
        const encodeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            let str = String(val);
            str = str.replace(/"/g, '""'); // escapes " -> ""
            return `"${str}"`; // surrounds with quotes
        };

        const baseHeaders = ['ID', 'Código', 'Título', 'Status', 'Dt. Cadastro', 'Prev. Entrega', 'Dt. Entrega', 'Prioridade', 'Tipo', 'Board', 'Coluna Atual', 'Ajustes', 'Formulário', 'Solicitante Nome', 'Solicitante Email', 'Solicitante Perfil', 'Responsáveis', 'Anexos'];
        const formHeaders = Array.from(formFieldsSet);
        const allHeaders = [...baseHeaders, ...formHeaders];

        const csvLines = [];
        // row de headers
        csvLines.push(allHeaders.map(encodeCSV).join(','));

        for (const item of processed) {
            const rowValues = [];
            for (const header of baseHeaders) {
                rowValues.push(item[header]);
            }
            // Add dynamic values
            for (const header of formHeaders) {
                rowValues.push(item[header] !== undefined ? item[header] : '');
            }
            csvLines.push(rowValues.map(encodeCSV).join(','));
        }

        const finalCSV = csvLines.join('\n');
        
        // Gerar arquivo para Download no Browser
        // Adicionando BOM utf-8 para Excel abrir com caracteres BR certos
        const blob = new Blob(["\uFEFF"+finalCSV], { type: 'text/csv;charset=utf-8;' });
        const urlObj = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = urlObj;
        a.download = 'tarefas_deskfy.csv';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            a.remove();
            window.URL.revokeObjectURL(urlObj);
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
        }, 300);
    }
});
