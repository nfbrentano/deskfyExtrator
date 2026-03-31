const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createObjectCsvStringifier } = require('csv-writer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/export', async (req, res) => {
    try {
        const { apiKey, initialDate, endDate } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API Key é obrigatória' });
        }

        let url = 'https://service-api.deskfy.io/v1/reports/workflow';
        const params = [];
        // Add query parameters if present
        if (initialDate) params.push(`initialDate=${initialDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        // Add the query string to the URL if we have parameters
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        console.log(`Buscando dados em: ${url}`);

        const response = await axios.get(url, {
            headers: { 'x-api-key': apiKey }
        });

        const data = response.data;
        if (!Array.isArray(data)) {
            return res.status(500).json({ error: 'A API não retornou uma lista de tarefas. Formato inesperado.' });
        }

        // Process records
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
            
            const row = {
                id: sol.id,
                codigo: sol.codigo,
                titulo: sol.titulo,
                dt_cadastro: sol.dt_cadastro,
                dt_preventrega: sol.dt_preventrega,
                dt_entrega: sol.dt_entrega,
                status: sol.status,
                prioridade: sol.prioridade,
                tipo: sol.tipo,
                board: sol.board,
                colunaatual: sol.colunaatual,
                ajustes: sol.ajustes,
                formulario: sol.formulario,
                solicitante_nome: solicitante.name,
                solicitante_email: solicitante.email,
                solicitante_perfil: solicitante.perfil,
                responsaveis: responsaveis,
                anexos: anexos
            };
            
            // Dynamic form fields extractions
            if (Array.isArray(item.resp_formulario)) {
                for (const rf of item.resp_formulario) {
                    const fieldName = rf.campo_nome ? `[Form] ${rf.campo_nome}` : null;
                    if (fieldName) {
                        formFieldsSet.add(fieldName);
                        let val = rf.resposta;
                        // Special handling for attachment fields inside the form
                        if (rf.campo_tipo === 'ATTACHMENT' && Array.isArray(rf.arquivos)) {
                            val = rf.arquivos.map(ar => ar.publicUrl || ar.name).join(', ');
                        }
                        row[fieldName] = val;
                    }
                }
            }
            processed.push(row);
        }

        // Build the headers
        const header = [
            { id: 'id', title: 'ID' },
            { id: 'codigo', title: 'Código' },
            { id: 'titulo', title: 'Título' },
            { id: 'status', title: 'Status' },
            { id: 'dt_cadastro', title: 'Dt. Cadastro' },
            { id: 'dt_preventrega', title: 'Prev. Entrega' },
            { id: 'dt_entrega', title: 'Dt. Entrega' },
            { id: 'prioridade', title: 'Prioridade' },
            { id: 'tipo', title: 'Tipo' },
            { id: 'board', title: 'Board' },
            { id: 'colunaatual', title: 'Coluna Atual' },
            { id: 'ajustes', title: 'Ajustes' },
            { id: 'formulario', title: 'Formulário' },
            { id: 'solicitante_nome', title: 'Solicitante Nome' },
            { id: 'solicitante_email', title: 'Solicitante Email' },
            { id: 'solicitante_perfil', title: 'Solicitante Perfil' },
            { id: 'responsaveis', title: 'Responsáveis' },
            { id: 'anexos', title: 'Anexos' }
        ];

        // Add dynamically discovered form fields to the headers
        for (const ff of formFieldsSet) {
            header.push({ id: ff, title: ff });
        }

        const csvStringifier = createObjectCsvStringifier({ header });
        // Generate final CSV string
        const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(processed);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="tarefas_deskfy.csv"');
        
        // Return CSV file
        return res.send(csvContent);

    } catch (error) {
        console.error("Erro na API Deskfy:");
        if (error.response) {
            console.error(error.response.status, error.response.data);
            return res.status(error.response.status).json({ error: `A API do Deskfy recusou a requisição (Status ${error.response.status}). Verifique a chave e datas.` });
        } else {
            console.error(error.message);
            return res.status(500).json({ error: 'Falha de comunicação com o servidor ou erro interno.' });
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
