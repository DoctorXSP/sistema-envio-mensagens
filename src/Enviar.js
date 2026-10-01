import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

export default function Enviar() {
  // Estados para gerenciar os dados do formulário de envio individual
  const [nome, setNome] = useState('');
  const [telefone1, setTelefone1] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [email1, setEmail1] = useState('');
  const [email2, setEmail2] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateSelecionado, setTemplateSelecionado] = useState('0');

  // Estados e validações robustas de usuários e permissões do navegador (suporte a localStorage e sessionStorage)
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

  // Estado para o select do administrador escolher qual usuário remetente deseja utilizar
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(isAdmin ? '' : usuarioLogadoId);

  // 1. Carrega a lista de usuários cadastrados (Executado apenas se o usuário for Administrador)
  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3010/usuarios')
        .then(res => setUsuarios(res.data))
        .catch(err => console.error('Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // 2. Carrega os templates disponíveis (filtrando por ID de usuário caso um esteja selecionado)
  useEffect(() => {
    const idFiltro = isAdmin ? usuarioSelecionado : usuarioLogadoId;
    const url = idFiltro
      ? `http://localhost:3010/templates?usuario_id=${idFiltro}`
      : 'http://localhost:3010/templates';

    axios.get(url)
      .then(res => {
        setTemplates(res.data);
        setTemplateSelecionado('0');
        setAssunto('');
        setMensagem('');
      })
      .catch(err => console.error('Erro ao buscar templates:', err));
  }, [usuarioSelecionado, isAdmin, usuarioLogadoId]);

  // Função acionada ao selecionar um template pré-cadastrado na lista
  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setTemplateSelecionado(id);
    if (id === '0') {
      setAssunto('');
      setMensagem('');
    } else {
      const template = templates.find(t => t.id.toString() === id);
      if (template) {
        setAssunto(template.assunto || '');
        setMensagem(template.mensagem || '');
      }
    }
  };

  // Função auxiliar para estruturar o texto final da mensagem personalizada
  const montarMensagem = () => `Olá, ${nome}\n${mensagem}`;

  // Função auxiliar para limpar caracteres especiais dos números de telefone
  const limparTelefone = (numero) => {
    let limpo = (numero || '').replace(/\D/g, '');
    if (limpo.startsWith('55')) limpo = limpo.slice(2);
    return limpo;
  };

  // Função responsável pelo disparo e registro do envio via WhatsApp
  const enviarWhatsApp = async (e) => {
    e.preventDefault();
    const tel1 = limparTelefone(telefone1);
    const tel2 = limparTelefone(telefone2);
    const texto = encodeURIComponent(montarMensagem());
    const msg = montarMensagem();

    // Abre as abas do WhatsApp Web/API para os números informados
    if (tel1) window.open(`https://api.whatsapp.com/send?phone=55${tel1}&text=${texto}`, '_blank');
    if (tel2) window.open(`https://api.whatsapp.com/send?phone=55${tel2}&text=${texto}`, '_blank');

    const autorIdFinal = isAdmin ? (usuarioSelecionado ? Number(usuarioSelecionado) : null) : Number(usuarioLogadoId);

    const payload = {
      nome,
      tel1,
      tel2: tel2 || '',
      menssagem: msg,
      usuario_id: autorIdFinal
    };

    console.log('Enviando dados do WhatsApp:', payload);

    try {
      const response = await axios.post('http://localhost:3010/whatsapp', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Resposta do servidor (WhatsApp):', response.data);
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
    }
  };

  // Função responsável pelo disparo e registro do envio via E-mail
  const enviarEmail = async (e) => {
    e.preventDefault();
    const corpo = montarMensagem();
    const assuntoFinal = encodeURIComponent(assunto);
    const corpoEncoded = encodeURIComponent(corpo);

    const autorIdFinal = isAdmin ? (usuarioSelecionado ? Number(usuarioSelecionado) : null) : Number(usuarioLogadoId);

    const payload = {
      nome,
      email1,
      email2: email2 || '',
      assunto,
      menssagem: corpo,
      usuario_id: autorIdFinal
    };

    let mailto = `mailto:${email1}?subject=${assuntoFinal}&body=${corpoEncoded}`;
    if (email2) mailto += `&cc=${encodeURIComponent(email2)}`;
    window.open(mailto, '_blank');

    console.log('Enviando dados do Email:', payload);

    try {
      const response = await axios.post('http://localhost:3010/email', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Resposta do servidor (Email):', response.data);
    } catch (error) {
      console.error('Erro ao enviar Email:', error);
    }
  };

  return (
    <div className="container">
      <h2 className="titulo">Enviar mensagem por WhatsApp ou Email</h2>

      {/* Seletor de Usuário Remetente - Exibido EXCLUSIVAMENTE para administradores */}
      {isAdmin && (
        <div className="linha-template" style={{ marginBottom: '20px' }}>
          <label htmlFor="usuarioSelect">Usuário Remetente</label>
          <select
            id="usuarioSelect"
            value={usuarioSelecionado}
            onChange={(e) => setUsuarioSelecionado(e.target.value)}
            className="select-template"
            style={{ width: '100%', boxSizing: 'border-box' }}
          >
            <option value="">Todos os usuários / Geral</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome || u.login}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Seletor de Templates salvos no sistema */}
      <div className="linha-template">
        <label htmlFor="templateSelect">Template</label>
        <select
          id="templateSelect"
          value={templateSelecionado}
          onChange={handleTemplateChange}
          className="select-template"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          <option value="0">Sem templates</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {`${t.id} - ${t.assunto}`}
            </option>
          ))}
        </select>
      </div>

      {/* Campo de Nome do Destinatário */}
      <label>Nome do destinatário</label>
      <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />

      {/* Campos de Telefones para WhatsApp */}
      <div className="linha-telefones">
        <div className="campo-telefone">
          <label>Telefone 1</label>
          <input type="text" value={telefone1} onChange={(e) => setTelefone1(e.target.value)} />
        </div>
        <div className="campo-telefone">
          <label>Telefone 2 (opcional)</label>
          <input type="text" value={telefone2} onChange={(e) => setTelefone2(e.target.value)} />
        </div>
      </div>

      {/* Campos de E-mail */}
      <label>Email principal</label>
      <input type="email" value={email1} onChange={(e) => setEmail1(e.target.value)} />

      <label>Email cópia (opcional)</label>
      <input type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} />

      {/* Campos de Assunto e Corpo da Mensagem */}
      <label>Assunto</label>
      <input type="text" value={assunto} onChange={(e) => setAssunto(e.target.value)} />

      <label>Mensagem</label>
      <textarea rows="6" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />

      {/* Botões de Ação para Disparo */}
      <div className="botoes">
        <button type="button" onClick={enviarWhatsApp}>Enviar pelo WhatsApp</button>
        <button type="button" onClick={enviarEmail}>Enviar por Email</button>
      </div>
    </div>
  );
}