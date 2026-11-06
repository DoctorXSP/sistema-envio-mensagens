import React, { useState } from 'react';
import axios from 'axios';
import { CONFIG_REDE } from './config';
import './App.css';

export default function CadastrarUsuario() {
  // Estados para gerenciar os campos do formulário de cadastro de novos usuários
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [perfil, setPerfil] = useState('operador');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  // Estados para gerenciar o modal de disparo pós-cadastro
  const [mostrarModal, setMostrarModal] = useState(false);
  const [dadosRecemCadastrados, setDadosRecemCadastrados] = useState(null);
  const [senhaPuraTemporaria, setSenhaPuraTemporaria] = useState('');

  // Validação flexível do perfil logado: verifica localStorage e sessionStorage
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    'operador'
  ).toLowerCase().trim();

  // Define se o usuário atual possui privilégios de administrador
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // Função auxiliar para limpar caracteres especiais do número de telefone
  const limparTelefone = (numero) => {
    let limpo = (numero || '').replace(/\D/g, '');
    if (limpo.startsWith('55')) limpo = limpo.slice(2);
    return limpo;
  };

  // Função disparada ao enviar o formulário para registrar o novo usuário no backend
  const handleCadastrar = async (e) => {
    e.preventDefault();
    setMensagem({ texto: '', tipo: '' });

    if (!nome || !login || !password || !email) {
      setMensagem({ texto: 'Preencha todos os campos obrigatórios.', tipo: 'erro' });
      return;
    }

    const payload = {
      nome,
      login,
      password,
      perfil,
      email,
      whatsapp: limparTelefone(whatsapp)
    };

    try {
      const response = await axios.post(`${CONFIG_REDE.URL_BACKEND}/usuarios`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      setMensagem({ texto: response.data.message || 'Usuário cadastrado com sucesso!', tipo: 'sucesso' });
      
      // Guarda os dados para o modal e armazena a senha temporária para exibição na mensagem
      setDadosRecemCadastrados(response.data.usuarioCriado);
      setSenhaPuraTemporaria(password);

      // Limpa os campos principais do formulário
      setNome('');
      setLogin('');
      setPassword('');
      setEmail('');
      setWhatsapp('');
      setPerfil('operador');

      // Exibe o modal de disparo
      setMostrarModal(true);

    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      const erroMsg = error.response?.data?.message || 'Erro ao conectar com o servidor.';
      setMensagem({ texto: erroMsg, tipo: 'erro' });
    }
  };

  // Modelo de mensagem solicitado
  const gerarTextoMensagem = (usr) => {
    return `Olá ${usr.nome}, o administrador do Sistema de Envio de Mensagem Automática - SEMA, criou o seu acesso para a ferramenta. Seguem abaixo as suas credenciais:\n\nURL de acesso: https://sema.emersonsilv.win/\nUsuário: ${usr.login}\nSenha: ${senhaPuraTemporaria}\n\nLembrando que, para o envio de lote de e-mails, você deve utilizar um e-mail do Gmail; basta entrar no seu perfil e realizar a troca.`;
  };

  // Disparar via WhatsApp (igual ao Enviar.js abrindo a API oficial / link web)
  const dispararWhatsAppModal = () => {
    if (!dadosRecemCadastrados || !dadosRecemCadastrados.whatsapp) {
      alert('Nenhum número de WhatsApp cadastrado para este usuário.');
      return;
    }
    const tel = limparTelefone(dadosRecemCadastrados.whatsapp);
    const texto = encodeURIComponent(gerarTextoMensagem(dadosRecemCadastrados));
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${texto}`, '_blank', 'noopener,noreferrer');
  };

  // Disparar via E-mail (igual ao Enviar.js abrindo o cliente de e-mail via mailto)
  const dispararEmailModal = () => {
    if (!dadosRecemCadastrados || !dadosRecemCadastrados.email) {
      alert('Nenhum e-mail cadastrado para este usuário.');
      return;
    }
    const corpo = gerarTextoMensagem(dadosRecemCadastrados);
    const assuntoFinal = encodeURIComponent('Credenciais de Acesso - Sistema SEMA');
    const corpoEncoded = encodeURIComponent(corpo);
    let mailto = `mailto:${dadosRecemCadastrados.email}?subject=${assuntoFinal}&body=${corpoEncoded}`;
    window.open(mailto, '_blank', 'noopener,noreferrer');
  };

  // Trava de segurança: se o usuário logado não for admin, exibe Acesso Negado
  if (!isAdmin) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2 className="titulo" style={{ color: '#ff6b6b' }}>Acesso Negado</h2>
        <p style={{ color: 'white' }}>Esta página é restrita apenas para administradores do sistema.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="titulo">Cadastrar Novo Usuário do Sistema</h2>

      {mensagem.texto && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          backgroundColor: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
          color: mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
          border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={handleCadastrar}>
        <label>Nome Completo</label>
        <input 
          type="text" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          placeholder="Ex: Prof. Emerson Silva" 
          required 
        />

        <label>Login de Acesso</label>
        <input 
          type="text" 
          value={login} 
          onChange={(e) => setLogin(e.target.value)} 
          placeholder="Ex: emerson.silva" 
          required 
        />

        <label>Senha</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Insira a senha de acesso" 
          required 
        />

        <label>E-mail</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Ex: emerson@email.com" 
          required 
        />

        <label>Nº WhatsApp (Opcional)</label>
        <input 
          type="text" 
          value={whatsapp} 
          onChange={(e) => setWhatsapp(e.target.value)} 
          placeholder="Ex: 11988887777" 
        />

        <div className="linha-template" style={{ marginTop: '10px', marginBottom: '20px' }}>
          <label htmlFor="perfilSelect">Perfil de Acesso</label>
          <select
            id="perfilSelect"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="select-template"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px' }}
          >
            <option value="operador">Operador</option>
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div className="botoes">
          <button type="submit">Cadastrar Usuário</button>
        </div>
      </form>

      {/* MODAL DE PERGUNTAS PARA DISPARAR CREDENCIAIS PÓS-CADASTRO */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-conteudo" style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#0C4DA2', marginBottom: '15px' }}>Usuário Cadastrado com Sucesso!</h3>
            <p style={{ marginBottom: '20px', fontSize: '15px', lineHeight: '1.4' }}>
              Deseja disparar as credenciais de acesso para <b>{dadosRecemCadastrados?.nome}</b>?
            </p>

            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', textAlign: 'left', fontSize: '13px', color: '#334155', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
              {dadosRecemCadastrados && gerarTextoMensagem(dadosRecemCadastrados)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={dispararWhatsAppModal} 
                style={{ backgroundColor: '#25D366', color: 'white' }}
              >
                Disparar por WhatsApp
              </button>
              <button 
                type="button" 
                onClick={dispararEmailModal}
                style={{ backgroundColor: '#ea4335', color: 'white' }}
              >
                Disparar por E-mail
              </button>
              <button 
                type="button" 
                onClick={() => setMostrarModal(false)}
                style={{ backgroundColor: '#64748b', color: 'white' }}
              >
                Fechar / Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}