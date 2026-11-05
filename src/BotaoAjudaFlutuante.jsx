import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BotaoAjudaFlutuante() {
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