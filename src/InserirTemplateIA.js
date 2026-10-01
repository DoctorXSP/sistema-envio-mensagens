import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

export default function InserirTemplateIA() {
  // Estados do formulário de diretrizes para a IA gerar as mensagens
  const [motivo, setMotivo] = useState('');
  const [curso, setCurso] = useState('');
  const [publicoAlvo, setPublicoAlvo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [detalhes, setDetalhes] = useState('');

  // Estados de controle do processo da IA e das sugestões retornadas
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [sugestoes, setSugestoes] = useState([]); // Array contendo as opções retornadas pela IA
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(null); // Índice da opção escolhida pelo usuário
  const [instrucaoIteracao, setInstrucaoIteracao] = useState(''); // Instrução opcional para refinar/ajustar a mensagem com a IA

  // Estados finais do template para inserção definitiva no banco de dados
  const [ativo, setAtivo] = useState(true);
  const [assuntoFinal, setAssuntoFinal] = useState('');
  const [mensagemFinal, setMensagemFinal] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [message, setMessage] = useState('');

  // Leitura robusta do perfil logado em ambos os storages do navegador
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    'operador'
  ).toLowerCase().trim();

  // Leitura robusta do ID do usuário logado em ambos os storages do navegador
  const usuarioLogadoId = (
    localStorage.getItem('usuario_id') || 
    sessionStorage.getItem('usuario_id') || 
    localStorage.getItem('user_id') || 
    ''
  ).trim();

  // Validação booleana para verificar se o usuário logado possui perfil de administrador
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // Carrega a lista de usuários cadastrados e define o valor inicial padrão com base nas permissões
  useEffect(() => {
    axios.get('http://localhost:3010/usuarios')
      .then(res => {
        setUsuarios(res.data);
        if (isAdmin) {
          // Se for admin, define o ID logado como padrão ou o primeiro da lista
          const padrao = res.data.find(u => u.id === Number(usuarioLogadoId)) || res.data[0];
          if (padrao) setUsuarioId(padrao.id);
        } else {
          // Se for operador comum, trava obrigatoriamente no seu próprio ID logado
          setUsuarioId(usuarioLogadoId);
        }
      })
      .catch(err => console.error('Erro ao buscar usuários:', err));
  }, [isAdmin, usuarioLogadoId]);

  // Função para chamar o endpoint do Backend que consome o modelo de Inteligência Artificial
  const handleGerarComIA = async (e) => {
    e.preventDefault();
    if (!motivo || !objetivo) {
      alert('Por favor, preencha pelo menos o Motivo e o Objetivo da mensagem.');
      return;
    }

    setCarregandoIA(true);
    setMessage('');

    try {
      const payloadIA = {
        motivo,
        curso,
        publicoAlvo,
        objetivo,
        detalhes,
        iteracao: instrucaoIteracao // Caso seja uma segunda tentativa de ajuste / refinamento
      };

      // Requisição POST para o backend processar a IA (Gemini)
      const res = await axios.post('http://localhost:3010/gerar-template-ia', payloadIA);

      // Valida se o backend retornou o array de opções esperado
      if (res.data && res.data.opcoes) {
        setSugestoes(res.data.opcoes);
        setOpcaoSelecionada(0); // Seleciona automaticamente a primeira opção por padrão
        setAssuntoFinal(res.data.opcoes[0].assunto);
        setMensagemFinal(res.data.opcoes[0].mensagem);
        setMessage('Sugestões geradas com sucesso! Escolha uma opção abaixo.');
      } else {
        alert('A IA não retornou um formato válido.');
      }
    } catch (err) {
      console.error('Erro ao gerar com IA:', err);
      alert('Erro ao se comunicar com o assistente de IA.');
    } finally {
      setCarregandoIA(false);
    }
  };

  // Atualiza os campos finais automaticamente quando o usuário altera o Radio Button de opção
  const handleSelecionarOpcao = (index) => {
    setOpcaoSelecionada(index);
    setAssuntoFinal(sugestoes[index].assunto);
    setMensagemFinal(sugestoes[index].mensagem);
  };

  // Função final para salvar o template gerado por IA no banco de dados
  const handleSubmitFinal = async (e) => {
    e.preventDefault();

    // Define o ID final do autor: restringe operadores comuns ao seu próprio ID por segurança
    const autorIdFinal = isAdmin ? (usuarioId ? Number(usuarioId) : null) : Number(usuarioLogadoId);

    const payloadFinal = {
      ativo: ativo ? 1 : 0,
      assunto: assuntoFinal,
      mensagem: mensagemFinal,
      usuario_id: autorIdFinal
    };

    try {
      const response = await axios.post('http://localhost:3010/insert', payloadFinal, {
        headers: { 'Content-Type': 'application/json' }
      });

      setMessage(response.data.message || 'Template inserido com sucesso!');

      // Limpa os campos após alguns segundos para permitir novas criações
      setTimeout(() => {
        setMotivo('');
        setCurso('');
        setPublicoAlvo('');
        setObjetivo('');
        setDetalhes('');
        setSugestoes([]);
        setInstrucaoIteracao('');
        setMessage('Pronto para criar novo template com IA');
      }, 4000);

    } catch (error) {
      console.error('Erro ao inserir template:', error);
      setMessage('Erro ao inserir template no banco de dados.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '700px', margin: '20px auto' }}>
      <h2 className="titulo">Gerador de Template com Inteligência Artificial</h2>

      {/* Formulário de Parâmetros Iniciais para instruir a IA */}
      <form onSubmit={handleGerarComIA} style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px' }}>1. Parâmetros da Mensagem</h3>

        <label style={{ color: 'white' }}>Qual o motivo da mensagem?</label>
        <input
          type="text"
          value={motivo}
          placeholder="Ex: Divulgação do Vestibulinho, Lembrete de Aula..."
          required
          onChange={(e) => setMotivo(e.target.value)}
        />

        <label style={{ color: 'white' }}>Para qual curso?</label>
        <input
          type="text"
          value={curso}
          placeholder="Ex: Técnico em Informática e Redes de Computadores"
          onChange={(e) => setCurso(e.target.value)}
        />

        <label style={{ color: 'white' }}>Qual o público-alvo?</label>
        <input
          type="text"
          value={publicoAlvo}
          placeholder="Ex: Alunos do Ensino Médio, Comunidade em geral..."
          onChange={(e) => setPublicoAlvo(e.target.value)}
        />

        <label style={{ color: 'white' }}>Qual o objetivo principal?</label>
        <input
          type="text"
          value={objetivo}
          placeholder="Ex: Convencer alunos a se inscreverem no vestibulinho"
          required
          onChange={(e) => setObjetivo(e.target.value)}
        />

        <label style={{ color: 'white' }}>Detalhes importantes que não devem faltar (e mensagem que deseja transmitir):</label>
        <textarea
          rows="4"
          value={detalhes}
          placeholder="Insira os pontos-chave, links, prazos ou argumentos de venda que a IA deve priorizar..."
          required
          onChange={(e) => setDetalhes(e.target.value)}
        />

        <button 
          type="submit" 
          disabled={carregandoIA}
          style={{ marginTop: '10px', backgroundColor: '#3b82f6', color: 'white', padding: '10px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {carregandoIA ? 'Gerando com IA...' : 'Gerar Opções com IA 🤖'}
        </button>
      </form>

      {/* Exibição das opções geradas pela IA para escolha do usuário */}
      {sugestoes.length > 0 && (
        <form onSubmit={handleSubmitFinal} style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px' }}>2. Escolha a Melhor Opção Gerada</h3>

          {sugestoes.map((sug, index) => (
            <div 
              key={index} 
              style={{ 
                border: opcaoSelecionada === index ? '2px solid #3b82f6' : '1px solid #475569', 
                padding: '15px', 
                borderRadius: '6px', 
                marginBottom: '15px',
                background: '#0f172a'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="radio"
                  name="opcaoSugestao"
                  checked={opcaoSelecionada === index}
                  onChange={() => handleSelecionarOpcao(index)}
                />
                Opção {index + 1}: {sug.assunto}
              </label>
              <p style={{ color: '#cbd5e1', fontSize: '14px', whiteSpace: 'pre-wrap', margin: 0, paddingLeft: '24px' }}>
                {sug.mensagem}
              </p>
            </div>
          ))}

          {/* Seção de Refinamento / Iteração via Prompt adicional */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Deseja mudar algo na mensagem? (Instrução de ajuste)</label>
            <input
              type="text"
              value={instrucaoIteracao}
              placeholder="Ex: Deixe o tom mais persuasivo, reduza o tamanho, inclua emoji..."
              onChange={(e) => setInstrucaoIteracao(e.target.value)}
            />
            <button 
              type="button" 
              onClick={handleGerarComIA}
              style={{ marginTop: '8px', backgroundColor: '#475569', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Refinar com a IA 🔄
            </button>
          </div>

          <hr style={{ borderColor: '#475569', margin: '20px 0' }} />

          <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px' }}>3. Revisão e Inserção Final</h3>

          {/* Seleção do Usuário Responsável (Editável para Admin, travado para operadores) */}
          <label style={{ color: 'white' }}>Usuário Responsável</label>
          <select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            disabled={!isAdmin}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginBottom: '15px', 
              borderRadius: '4px', 
              boxSizing: 'border-box',
              backgroundColor: !isAdmin ? '#0f172a' : '#fff',
              color: !isAdmin ? '#94a3b8' : '#000',
              cursor: !isAdmin ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">Sem usuário atribuído</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome || u.login}
              </option>
            ))}
          </select>

          {/* Botão Toggle para definir se o template está ativo */}
          <div className="label-toggle" style={{ marginBottom: '15px' }}>
            <label style={{ color: 'white' }}>Ativo</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={ativo}
                onChange={() => setAtivo(!ativo)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <label style={{ color: 'white' }}>Assunto (Editável)</label>
          <input
            type="text"
            value={assuntoFinal}
            required
            onChange={(e) => setAssuntoFinal(e.target.value)}
          />

          <label style={{ color: 'white' }}>Mensagem (Editável)</label>
          <textarea
            rows="8"
            value={mensagemFinal}
            required
            onChange={(e) => setMensagemFinal(e.target.value)}
          />

          <div className="botoes" style={{ marginTop: '15px' }}>
            <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
              Inserir Template Definitivo 💾
            </button>
          </div>

          {message && <p style={{ color: '#38bdf8', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>{message}</p>}
        </form>
      )}
    </div>
  );
}