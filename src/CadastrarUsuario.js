import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

export default function CadastrarUsuario() {
  // Estados para gerenciar os campos do formulário de cadastro de novos usuários
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('operador');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  // Validação flexível do perfil logado: verifica localStorage e sessionStorage para evitar bloqueios
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    'operador'
  ).toLowerCase().trim();

  // Define se o usuário atual possui privilégios de administrador
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // Função disparada ao enviar o formulário para registrar o novo usuário no backend
  const handleCadastrar = async (e) => {
    e.preventDefault();
    setMensagem({ texto: '', tipo: '' });

    // Validação básica para garantir que nenhum campo obrigatório esteja vazio
    if (!nome || !login || !password || !email) {
      setMensagem({ texto: 'Preencha todos os campos obrigatórios.', tipo: 'erro' });
      return;
    }

    // Objeto contendo os dados coletados no formulário
    const payload = {
      nome,
      login,
      password,
      perfil,
      email
    };

    try {
      // Requisição POST para o servidor cadastrar o usuário no banco MySQL
      const response = await axios.post('http://localhost:3010/usuarios', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Exibe mensagem de sucesso retornada pela API
      setMensagem({ texto: response.data.message || 'Usuário cadastrado com sucesso!', tipo: 'sucesso' });
      
      // Reseta os campos do formulário após o cadastro bem-sucedido
      setNome('');
      setLogin('');
      setPassword('');
      setEmail('');
      setPerfil('operador');

    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      const erroMsg = error.response?.data?.message || 'Erro ao conectar com o servidor.';
      setMensagem({ texto: erroMsg, tipo: 'erro' });
    }
  };

  // Trava de segurança: se o usuário logado não for admin, exibe a tela de Acesso Negado
  if (!isAdmin) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2 className="titulo" style={{ color: '#ff6b6b' }}>Acesso Negado</h2>
        <p style={{ color: 'white' }}>Esta página é restrita apenas para administradores do sistema.</p>
      </div>
    );
  }

  // Renderização principal do formulário de cadastro para administradores
  return (
    <div className="container">
      <h2 className="titulo">Cadastrar Novo Usuário do Sistema</h2>

      {/* Bloco condicional para exibir mensagens de feedback (sucesso ou erro) */}
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
        {/* Campo de Nome Completo */}
        <label>Nome Completo</label>
        <input 
          type="text" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
          placeholder="Ex: Prof. Emerson Silva" 
          required 
        />

        {/* Campo de Login de Acesso */}
        <label>Login de Acesso</label>
        <input 
          type="text" 
          value={login} 
          onChange={(e) => setLogin(e.target.value)} 
          placeholder="Ex: emerson.silva" 
          required 
        />

        {/* Campo de Senha */}
        <label>Senha</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Insira a senha de acesso" 
          required 
        />

        {/* Campo de E-mail */}
        <label>E-mail</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Ex: emerson@email.com" 
          required 
        />

        {/* Seleção do Perfil/Nível de Permissão */}
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

        {/* Botão de Envio do Formulário */}
        <div className="botoes">
          <button type="submit">Cadastrar Usuário</button>
        </div>
      </form>
    </div>
  );
}