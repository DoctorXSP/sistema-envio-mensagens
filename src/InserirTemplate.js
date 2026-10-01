import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function InserirTemplate() {
  // Estados para gerenciar os dados do formulário de inserção de template
  const [ativo, setAtivo] = useState(true);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [message, setMessage] = useState('');

  // Estados e dados dos usuários / permissões do navegador (suporte flexível a localStorage e sessionStorage)
  const [usuarios, setUsuarios] = useState([]);
  
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

  // Estado para armazenar o ID do usuário responsável pelo template
  const [usuarioId, setUsuarioId] = useState('');

  // 1. Carrega a lista de usuários cadastrados e define o valor inicial padrão com base nas permissões
  useEffect(() => {
    axios.get('http://localhost:3010/usuarios')
      .then(res => {
        setUsuarios(res.data);
        
        if (isAdmin) {
          // Se for admin, tenta buscar o ID padrão (ex: 3 ou o próprio admin logado)
          const padrao = res.data.find(u => u.id === Number(usuarioLogadoId)) || res.data[0];
          if (padrao) setUsuarioId(padrao.id);
        } else {
          // Se for operador comum, trava obrigatoriamente no seu próprio ID logado
          setUsuarioId(usuarioLogadoId);
        }
      })
      .catch(err => console.error('Erro ao buscar usuários:', err));
  }, [isAdmin, usuarioLogadoId]);

  // Função acionada ao enviar o formulário para salvar o template no banco de dados
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Define o ID final do autor: se for operador comum, força o ID logado por segurança
    const autorIdFinal = isAdmin ? (usuarioId ? Number(usuarioId) : null) : Number(usuarioLogadoId);

    const payload = {
      ativo: ativo ? 1 : 0,
      assunto,
      mensagem,
      usuario_id: autorIdFinal
    };

    console.log('Enviando dados do formulário:', payload);

    try {
      const response = await axios.post('http://localhost:3010/insert', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Resposta do servidor:', response.data);
      setMessage(response.data.message || 'Template inserido com sucesso!');

      // Aguarda 5 segundos, limpa os campos e exibe nova mensagem de status
      setTimeout(() => {
        setAssunto('');
        setMensagem('');
        setMessage('Pronto para inserir novo template');

        // Aguarda mais 5 segundos e limpa o texto informativo da tela
        setTimeout(() => {
          setMessage('');
        }, 5000);
      }, 5000);

    } catch (error) {
      console.error('Erro ao enviar:', error);
      setMessage('Erro ao inserir template.');
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h2 className="titulo">Inserção de Template</h2>

        {/* Seleção do Usuário Dono do Template: Editável apenas por Admin, fixo para operador */}
        <label>Usuário Responsável</label>
        <select
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          disabled={!isAdmin} // Operador não pode alterar o autor do template
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '15px',
            borderRadius: '4px',
            boxSizing: 'border-box',
            backgroundColor: !isAdmin ? '#1e293b' : '#fff',
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

        {/* Botão de alternância (Toggle) para definir se o template está ativo */}
        <div className="label-toggle">
          <label>Ativo</label>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={ativo}
              onChange={() => setAtivo(!ativo)}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Campo de Assunto do Template */}
        <label>Assunto</label>
        <input
          type="text"
          value={assunto}
          required
          onChange={(e) => setAssunto(e.target.value)}
        />

        {/* Campo de Corpo da Mensagem */}
        <label>Mensagem</label>
        <textarea
          rows="8"
          value={mensagem}
          required
          onChange={(e) => setMensagem(e.target.value)}
        />

        {/* Botão de Disparo/Envio */}
        <div className="botoes">
          <button type="submit">Enviar Template</button>
        </div>

        {/* Mensagem de feedback visual após a inserção */}
        {message && <p style={{ color: 'white', marginTop: '10px' }}>{message}</p>}
      </form>
    </div>
  );
}

export default InserirTemplate;