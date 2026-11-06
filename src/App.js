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
        <Link to="/ajuda" className="botao-ajuda-manual">
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
            Sistema de envio de mensagens pelo Whatsapp e por e-Mail, para seu devido funcionamento é necessário a instalação do:<br /><br />
            <div style={{textAlign:'center'}}>
            <a href="https://www.whatsapp.com/download" target="_blank" rel="noopener noreferrer">Baixar WhatsApp para Desktop</a><br />
            <a href="https://www.microsoft.com/en-us/microsoft-365/outlook/outlook-for-windows" target="_blank" rel="noopener noreferrer">Baixar Outlook para Desktop</a><br />
            </div><br />
            O
O sistema roda em cima de um sistema Node.js para backend e React para frontend, conectando com um banco de dados MySQL. (Nota:Recomenda-se usar navegadores de PC para melhor experiência). Possui uma tela de envio de mensagens para WhatsApp (permitindo disparar para até 2 números simultaneamente) e múltiplas contas de e-mail ao mesmo tempo, além de contar com uma poderosa ferramenta de disparo em lote para campanhas em massa*. Também dispõe de uma área completa para gerenciamento de templates incluindo criação de templates direcionados com auxílio de Inteligência Artificial focada em marketing, edição e listagem de modelos prontos para disparos rápidos, bem como painéis de histórico para e-mails e mensagens de WhatsApp enviados. *Use com parcimônia uma vez que o WhatsApp está focando em retirar recursos não oficiais, porém por enquanto funciona. Entre em contato para ajudar a saber mais.<br />
            <strong>Criado por: </strong>Prof. Emerson Silva <a href='mailto:emerson.silva463@etec.sp.gov.br'>emerson.silva463@etec.sp.gov.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;