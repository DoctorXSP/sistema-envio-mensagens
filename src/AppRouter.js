import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import Enviar from './Enviar';
import EnviarLote from './EnviarLote';
import InserirTemplate from './InserirTemplate';
import InserirTemplateIA from './InserirTemplateIA'; // Novo componente de IA integrado
import EdicaoTemplate from './EdicaoTemplate';
import ListaTemplates from './ListaTemplates';
import ListarWhatsapp from './ListarWhatsapp';
import ListarEmail from './ListarEmail';
import CadastrarUsuario from './CadastrarUsuario';
import EditarPerfil from './EditarPerfil';
import logo from './img/logo.png';
import './App.css';

// 1. COMPONENTE DE TELA DE LOGIN
function LoginScreen({ onLoginSuccess }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [permanecerConectado, setPermanecerConectado] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');

    try {
      const res = await axios.get('http://localhost:3010/usuarios');
      const usuarios = res.data;
      const usuarioEncontrado = usuarios.find(u => u.login === login);

      if (usuarioEncontrado) {
        const storage = permanecerConectado ? localStorage : sessionStorage;
        
        storage.setItem('usuario_id', usuarioEncontrado.id);
        storage.setItem('perfil', usuarioEncontrado.perfil);
        storage.setItem('nome', usuarioEncontrado.nome || usuarioEncontrado.login);
        
        onLoginSuccess();
      } else {
        setErro('Usuário ou senha inválidos.');
      }
    } catch (err) {
      console.error('Erro ao tentar logar:', err);
      setErro('Erro de conexão com o servidor.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1e3a8a',
      color: 'white'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <img 
          src={logo} 
          alt="Logo" 
          style={{ maxWidth: '100px', height: 'auto' }} 
        />
        <h2 style={{ 
          margin: 0,
          fontWeight: 'bold',
          fontSize: '52px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          Sistema de Envio de Mensagens
        </h2>
      </div>

      <form onSubmit={handleLogin} style={{
        background: '#1e293b',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        width: '320px',
        textAlign: 'center',
        border: '1px solid #3b82f6'
      }}>
        <h3 style={{ marginBottom: '20px' }}>Acesso ao Sistema</h3>
        
        {erro && <p style={{ color: '#ff6b6b', marginBottom: '15px', fontSize: '14px' }}>{erro}</p>}

        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Usuário / Login</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="permanecer"
            checked={permanecerConectado}
            onChange={(e) => setPermanecerConectado(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="permanecer" style={{ fontSize: '13px', cursor: 'pointer' }}>Permanecer conectado</label>
        </div>

        <button type="submit" style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Entrar
        </button>
      </form>
    </div>
  );
}

// 2. COMPONENTE DA BARRA LATERAL (SIDEBAR) COM LOGOFF SEGURO
function SidebarContent({ onLogout }) {
  const perfilLogado = localStorage.getItem('perfil') || sessionStorage.getItem('perfil');
  const isAdmin = perfilLogado === 'admin';

  return (
    <nav className="sidebar">
      <h3>Sistema de <br />Envio de Mensagens</h3>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/enviar">Enviar</Link></li>
        <li><Link to="/enviar-lote">Envio em Lote</Link></li>
        <li><Link to="/lista-whatsapp">Lista de Whatsapp Enviados</Link></li>
        <li><Link to="/lista-email">Lista de e-Mail Enviados</Link></li>
        <li><Link to="/inserir-template">Inserir Template</Link></li>
        <li><Link to="/inserir-template-ia">Inserir Template com IA 🤖</Link></li> {/* Novo item adicionado */}
        <li><Link to="/lista-templates">Lista de Templates</Link></li>
        <li><Link to="/editar-template">Editar Template</Link></li>
        
        <li><Link to="/editar-perfil">Editar Perfil</Link></li>

        {isAdmin && (
          <li><Link to="/cadastrar-usuario">Cadastrar Usuário</Link></li>
        )}

        <li>
          <a href="#logoff" onClick={onLogout} style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
            Desconectar / Sair
          </a>
        </li>
      </ul>
      <img src={logo} alt="Logo" />
    </nav>
  );
}

// 3. ESTRUTURA PRINCIPAL DO Roteador
function AppRouter() {
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const usuarioId = localStorage.getItem('usuario_id') || sessionStorage.getItem('usuario_id');
    if (usuarioId) {
      setIsLogged(true);
    }
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();

    localStorage.clear();
    sessionStorage.clear();

    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });

    setIsLogged(false);
  };

  if (!isLogged) {
    return <LoginScreen onLoginSuccess={() => setIsLogged(true)} />;
  }

  // Verifica o perfil para proteger a rota de cadastro de usuário
  const perfilLogado = localStorage.getItem('perfil') || sessionStorage.getItem('perfil');
  const isAdmin = perfilLogado === 'admin';

  return (
    <Router>
      <div className="layout">
        <SidebarContent onLogout={handleLogout} />
        <main className="content">
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/enviar" element={<Enviar />} />
            <Route path="/enviar-lote" element={<EnviarLote />} />
            <Route path="/lista-whatsapp" element={<ListarWhatsapp />} />
            <Route path="/lista-email" element={<ListarEmail/>} />
            <Route path="/inserir-template" element={<InserirTemplate />} />
            <Route path="/inserir-template-ia" element={<InserirTemplateIA />} /> {/* Nova rota mapeada */}
            <Route path="/lista-templates" element={<ListaTemplates />} />
            <Route path="/editar-template" element={<EdicaoTemplate />} />
            <Route path="/editar-template/:id" element={<EdicaoTemplate />} />
            <Route path="/editar-perfil" element={<EditarPerfil />} />
            {isAdmin && (
              <Route path="/cadastrar-usuario" element={<CadastrarUsuario />} />
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default AppRouter;