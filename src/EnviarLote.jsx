import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function EnviarLote() {
  // Estados para gerenciar os templates disponíveis e o selecionado
  const [templates, setTemplates] = useState([]);
  const [templateSelecionado, setTemplateSelecionado] = useState('');
  
  // Estados para gerenciar contatos da planilha, logs de execução e status do envio
  const [dadosContatos, setDadosContatos] = useState([]);
  const [logsExecucao, setLogsExecucao] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [statusGeral, setStatusGeral] = useState('');

  // Estados e dados dos usuários / permissões do navegador (suporte flexível a localStorage e sessionStorage)
  const [usuarios, setUsuarios] = useState([]);
  
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    'operador'
  ).toLowerCase().trim();

  const usuarioLogadoId = (
    localStorage.getItem('usuario_id') || 
    sessionStorage.getItem('usuario_id') || 
    localStorage.getItem('user_id') || 
    ''
  ).trim();

  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // Estado para o select do Admin escolher qual remetente disparará o lote
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(isAdmin ? '' : usuarioLogadoId);

  // ==========================================
  // Carregar lista de usuários (Apenas para Admin)
  // ==========================================
  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3010/usuarios')
        .then(res => setUsuarios(res.data))
        .catch(err => console.error('❌ [DEBUG] Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // ==========================================
  // Carregar templates ao iniciar (filtrando por ID de usuário se selecionado)
  // ==========================================
  useEffect(() => {
    console.log('🔍 [DEBUG] Iniciando busca de templates na API...');
    
    const idFiltro = isAdmin ? usuarioSelecionado : usuarioLogadoId;
    const url = idFiltro
      ? `http://localhost:3010/templates?usuario_id=${idFiltro}`
      : 'http://localhost:3010/templates';

    axios.get(url)
      .then(res => {
        console.log('✅ [DEBUG] Templates recebidos com sucesso:', res.data);
        setTemplates(res.data);
        setTemplateSelecionado('');
      })
      .catch(err => {
        console.error('❌ [DEBUG] Erro ao buscar templates na API:', err);
        alert('Erro ao carregar templates do servidor. Verifique se o backend está rodando.');
      });
  }, [usuarioSelecionado, isAdmin, usuarioLogadoId]);

  // ==========================================
  // Leitura da Planilha (CSV ou XLSX)
  // ==========================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.warn('⚠️ [DEBUG] Nenhum arquivo selecionado.');
      return;
    }

    console.log('📁 [DEBUG] Arquivo selecionado:', file.name, 'Tamanho:', file.size, 'bytes');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        console.log('📑 [DEBUG] Abas encontradas na planilha:', wb.SheetNames);

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        console.log('📊 [DEBUG] Dados brutos convertidos de JSON:', data);

        if (data.length === 0) {
          console.warn('⚠️ [DEBUG] A planilha está vazia ou os cabeçalhos não foram reconhecidos.');
          alert('A planilha parece estar vazia ou com formato incorreto.');
          return;
        }

        // Normalização flexível dos campos da planilha (suporta variações maiúsculas/minúsculas)
        const formatados = data.map((item, index) => {
          const contatoFormatado = {
            nome: item.nome || item.Nome || `Cliente ${index + 1}`,
            telefone1: String(item.telefone1 || item.Telefone1 || item.tel1 || item.telefone || '').trim(),
            telefone2: String(item.telefone2 || item.Telefone2 || item.tel2 || '').trim(),
            email: String(item.email || item.Email || item.email1 || '').trim()
          };
          return contatoFormatado;
        });

        console.log('✨ [DEBUG] Contatos normalizados prontos para envio:', formatados);
        setDadosContatos(formatados);
        setStatusGeral(`Arquivo carregado com sucesso! ${formatados.length} contatos encontrados.`);
      } catch (err) {
        console.error('❌ [DEBUG] Erro crítico ao processar o arquivo XLSX/CSV:', err);
        alert('Erro ao ler a planilha. Certifique-se de que é um arquivo CSV ou Excel válido.');
      }
    };

    reader.onerror = (error) => {
      console.error('❌ [DEBUG] Erro no FileReader ao ler o arquivo:', error);
    };

    reader.readAsBinaryString(file);
  };

  // ==========================================
  // Disparo Inteligente em Lote via Streaming (SSE)
  // ==========================================
  const iniciarEnvioEmLote = async () => {
    console.log('🚀 [DEBUG] Botão de disparo em lote acionado.');

    if (!templateSelecionado) {
      alert('Selecione um template de mensagem primeiro!');
      return;
    }
    if (dadosContatos.length === 0) {
      alert('Nenhum contato carregado na planilha!');
      return;
    }

    setEnviando(true);
    setLogsExecucao(['🚀 Iniciando conexão com o servidor para disparos em tempo real...']);
    setStatusGeral('Processando disparos em lote...');

    // Define qual ID de usuário remetente será enviado para o backend
    const autorIdFinal = isAdmin ? (usuarioSelecionado ? Number(usuarioSelecionado) : Number(usuarioLogadoId)) : Number(usuarioLogadoId);
    console.log(`ℹ️ [DEBUG] Contexto de Envio -> Template ID: ${templateSelecionado} | Remetente ID: ${autorIdFinal}`);

    try {
      const response = await fetch('http://localhost:3010/enviar-lote-streaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contatos: dadosContatos,
          templateId: templateSelecionado,
          usuario_id: autorIdFinal
        })
      });

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Mantém fragmento incompleto

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '');
            const evento = JSON.parse(jsonStr);

            if (evento.tipo === 'inicio') {
              setLogsExecucao(prev => [...prev, `📥 Lote aceito pelo servidor! Total: ${evento.total} contatos.`]);
            } else if (evento.tipo === 'progresso') {
              setLogsExecucao(prev => [...prev, `\n⏳ [${evento.indice}/${evento.total}] Contato: ${evento.nome}`]);
            } else if (evento.tipo === 'sucesso') {
              if (evento.canal === 'email') {
                setLogsExecucao(prev => [...prev, `   📧 E-mail enviado com sucesso para ${evento.destinatario}`]);
              } else if (evento.canal === 'whatsapp1') {
                setLogsExecucao(prev => [...prev, `   📱 WhatsApp 1 enviado com sucesso para ${evento.destinatario}`]);
              } else if (evento.canal === 'whatsapp2') {
                setLogsExecucao(prev => [...prev, `   📱 WhatsApp 2 (secundário) enviado para ${evento.destinatario}`]);
              }
            } else if (evento.tipo === 'falha') {
              setLogsExecucao(prev => [...prev, `   ❌ Falha no canal [${evento.canal}]: ${evento.erro}`]);
            } else if (evento.tipo === 'espera') {
              setLogsExecucao(prev => [...prev, `   🕒 Aguardando intervalo de ${evento.minutos} min para o próximo contato...`]);
            } else if (evento.tipo === 'fim') {
              setLogsExecucao(prev => [...prev, `\n✅ [FIM] Lote processado de ponta a ponta com sucesso!`]);
              setStatusGeral('✅ Todos os disparos do lote foram concluídos!');
              setEnviando(false);
            } else if (evento.tipo === 'erro') {
              setLogsExecucao(prev => [...prev, `❌ Erro: ${evento.mensagem}`]);
              setEnviando(false);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ [DEBUG] Erro na requisição streaming:', err);
      setLogsExecucao(prev => [...prev, `❌ Erro de conexão com o servidor backend.`]);
      setStatusGeral('❌ Erro durante o processamento.');
      setEnviando(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <h2>Envio Automatizado em Lote (WhatsApp 1, WhatsApp 2 e E-mail)</h2>
      
      {/* Seletor de Usuário Remetente - Exibido EXCLUSIVAMENTE para administradores */}
      {isAdmin && (
        <div style={{ marginBottom: '20px', background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
          <label htmlFor="usuarioSelect" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#6ee7b7' }}>
            🛠️ [ADMIN] Selecione o Usuário Remetente do Lote:
          </label>
          <select
            id="usuarioSelect"
            value={usuarioSelecionado}
            onChange={(e) => setUsuarioSelecionado(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}
          >
            <option value="">Seu próprio usuário (Logado)</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome || u.login} ({u.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Instruções para formatação da planilha */}
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155' }}>
        <h4>📌 Instruções para o arquivo (CSV ou XLSX):</h4>
        <p style={{ fontSize: '14px', margin: '5px 0' }}>Sua planilha deve conter os cabeçalhos correspondentes:</p>
        <ul style={{ fontSize: '13px', margin: '5px 0 0 20px' }}>
          <li><b>nome</b> (Nome do destinatário)</li>
          <li><b>telefone1</b> ou <b>tel1</b> (Obrigatório - Ex: 5511952929870)</li>
          <li><b>telefone2</b> ou <b>tel2</b> (Opcional - Se preenchido, dispara após o tel1)</li>
          <li><b>email</b> (Opcional - E-mail para envio simultâneo)</li>
        </ul>
      </div>

      {/* Controles de Importação e Seleção de Template */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>1. Selecione o Template:</label>
          <select 
            value={templateSelecionado} 
            onChange={(e) => {
              setTemplateSelecionado(e.target.value);
              console.log('🎯 [DEBUG] Template selecionado alterado para ID:', e.target.value);
            }}
            style={{ padding: '8px', borderRadius: '4px', width: '350px' }}
          >
            <option value="">Selecione um template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.assunto ? `[${t.assunto}] - ` : ''}{t.mensagem ? t.mensagem.substring(0, 50) : 'Sem mensagem'}...
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>2. Carregar Planilha (CSV/XLSX):</label>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
        </div>
      </div>

      {statusGeral && <p style={{ fontWeight: 'bold', color: '#6ee7b7' }}>{statusGeral}</p>}

      {/* Tabela de Pré-visualização dos Contatos Carregados */}
      {dadosContatos.length > 0 && (
        <div>
          <h3>Pré-visualização dos Contatos ({dadosContatos.length})</h3>
          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #475569', borderRadius: '4px', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#334155', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Nome</th>
                  <th style={{ padding: '8px' }}>Telefone 1</th>
                  <th style={{ padding: '8px' }}>Telefone 2</th>
                  <th style={{ padding: '8px' }}>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {dadosContatos.map((c, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '8px' }}>{c.nome}</td>
                    <td style={{ padding: '8px' }}>{c.telefone1}</td>
                    <td style={{ padding: '8px' }}>{c.telefone2 || '-'}</td>
                    <td style={{ padding: '8px' }}>{c.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!enviando && (
            <button 
              onClick={iniciarEnvioEmLote}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🚀 Iniciar Disparo Inteligente (E-mail + Wp1 + Wp2 condicional)
            </button>
          )}
        </div>
      )}

      {/* Caixa de Log de Execução em Tempo Real */}
      <div style={{ marginTop: '25px' }}>
        <h3>Logs de Execução em Tempo Real:</h3>
        <div style={{ 
          background: '#1e293b', 
          padding: '15px', 
          borderRadius: '8px', 
          height: '280px', 
          overflowY: 'auto', 
          fontFamily: 'monospace', 
          fontSize: '13px',
          border: '1px solid #334155',
          whiteSpace: 'pre-wrap',
          color: '#cbd5e1'
        }}>
          {logsExecucao.length === 0 ? 'Aguardando início do lote...' : logsExecucao.join('\n')}
        </div>
      </div>
    </div>
  );
}