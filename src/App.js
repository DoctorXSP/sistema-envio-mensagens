import React from 'react';
import { Link } from 'react-router-dom';
import roboImg from './img/robo.png';
import './App.css';

function App() {
  return (
    <div className="container2" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 className="titulo2" style={{ textAlign: 'center' }}>Sistema de <br />Envio de Mensagens</h2>
      
      {/* Botão de Acesso ao Manual / Landing Page de Ajuda Centralizado */}
      <div style={{ marginBottom: '30px', textAlign: 'center', width: '100%' }}>
        <Link to="/ajuda" style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          display: 'inline-block'
        }}>
          📖 Acessar Manual de Uso (Ajuda)
        </Link>
      </div>

      {/* Container principal deslocado para a esquerda, ocupando a área necessária */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '30px', 
        flexWrap: 'wrap', 
        justifyContent: 'flex-start',
        textAlign: 'justify',
        marginLeft: '0px'
      }}>
        {/* Imagem do Robô (350x350px) alinhada à esquerda */}
        <div style={{ flexShrink: 0, width: '350px' }}>
          <img 
            src={roboImg} 
            alt="Robô Assistente SEMA" 
            style={{ width: '350px', height: '350px', objectFit: 'contain', display: 'block' }} 
          />
        </div>

        {/* Texto descritivo justificado ocupando o espaço restante */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <p className='textoHome' style={{ margin: 0, textAlign: 'justify', lineHeight: '1.6' }}> 
            Sistema de envio de mensagens pelo Whatsapp e por e-Mail,<br />
            para seu devido funcionamento é necessário a instalação do:<br /><br />
            
            <a href="https://www.whatsapp.com/download" target="_blank" rel="noopener noreferrer">Baixar WhatsApp para Desktop</a><br />
            <a href="https://www.microsoft.com/en-us/microsoft-365/outlook/outlook-for-windows" target="_blank" rel="noopener noreferrer">Baixar Outlook para Desktop</a><br />
            <br />
            O sistema roda em cima de um sistema Node.js para backend e React para frontend, conectando com um banco de dados MySQL.<br />
            Possui uma tela de envio de mensagens para Whatsapp e e-Mail. Também tem uma área de cadastramento de templates de mensagens, assim como uma área de edição de templates e listagem de templates, e-mails enviados e mensagens de WhatsApp enviados.
            <br /><br /><br />
            <strong>Criado por: </strong>Prof. Emerson Silva <a href='mailto:emerson.silva463@etec.sp.gov.br'>emerson.silva463@etec.sp.gov.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;