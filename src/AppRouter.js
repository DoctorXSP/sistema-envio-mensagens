import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CONFIG_REDE } from './config';
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
import Ajuda from './Ajuda'; // Novo componente de Manual de Uso / Ajuda
import logo from './img/logo.png';
import './App.css';

// COMPONENTE DO BOTÃO FLUTUANTE DE AJUDA (? AJUDA)
function BotaoAjudaFlutuante() {
  const navigate = useNavigate();
  const location = useLocation();

  // Se já estiver na página de ajuda, não exibe o botão flutuante
  if (location.pathname === '/ajuda') return null;

  // Mapeia a rota atual para a seção correspondente no manual
  const obterPontoAjuda = () => {
    const path = location.pathname;
    if (path === '/enviar') return '#enviar';
    if (path === '/enviar-lote') return '#enviar-lote';
    if (path.includes('template')) return '#templates';
    if (path === '/lista-whatsapp' || path === '/lista-email') return '#historico';
    if (path === '/editar-perfil' || path === '/cadastrar-usuario') return '#perfil';
    return '#home';
  };

  const handleClick = () => {
    const secao = obterPontoAjuda();
    navigate('/ajuda' + secao);
  };

  return (
    <div 
      onClick={handleClick}
      title="Ajuda do Sistema"
      style={{
        position: 'fixed',
        top: '20px',
        right: '25px',
        zIndex: 9999,
        background: '#3b82f6',
        color: 'white',
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s',
        border: '2px solid white'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
    >
      <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>?</span>
      <span style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '2px' }}>Ajuda</span>
    </div>
  );
}

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
      const res = await axios.get(`${CONFIG_REDE.URL_BACKEND}/usuarios`);
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
          style={{ maxWidth: '100px', height: 'auto', marginTop: '-50px' }} 
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
        <li><Link to="/inserir-template-ia">Inserir Template com IA 🤖</Link></li>
        <li><Link to="/lista-templates">Lista de Templates</Link></li>
        <li><Link to="/editar-template">Editar Template</Link></li>
        <li><Link to="/editar-perfil">Editar Perfil</Link></li>
        <li><Link to="/ajuda">Manual / Ajuda 📖</Link></li>

        {isAdmin && (
          <li><Link to="/cadastrar-usuario">Cadastrar Usuário</Link></li>
        )}

        <li>
          <a href="#logoff" onClick={onLogout} rel="noopener noreferrer" style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
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
        <BotaoAjudaFlutuante />
        <main className="content">
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/enviar" element={<Enviar />} />
            <Route path="/enviar-lote" element={<EnviarLote />} />
            <Route path="/lista-whatsapp" element={<ListarWhatsapp />} />
            <Route path="/lista-email" element={<ListarEmail/>} />
            <Route path="/inserir-template" element={<InserirTemplate />} />
            <Route path="/inserir-template-ia" element={<InserirTemplateIA />} />
            <Route path="/lista-templates" element={<ListaTemplates />} />
            <Route path="/editar-template" element={<EdicaoTemplate />} />
            <Route path="/editar-template/:id" element={<EdicaoTemplate />} />
            <Route path="/editar-perfil" element={<EditarPerfil />} />
            <Route path="/ajuda" element={<Ajuda />} />
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