import React, { useState } from 'react';
import './App.css';

function App() {
 

  return (
    <div className="container2">
      <h2 className="titulo2">Sistema de <br />Envio de Mensagens</h2>
      <p className='textoHome'> Sistema de envio de mensagens pelo Whatsapp e por e-Mail,<br />
      para seu devido funcionamento é necessário a instalação do:<br /><br />
        
<a href="https://www.whatsapp.com/download" target="_blank">Baixar WhatsApp para Desktop</a><br />

<a href="https://www.microsoft.com/en-us/microsoft-365/outlook/outlook-for-windows" target="_blank">Baixar Outlook para Desktop</a><br />

<a href="https://nodejs.org/en/download" target="_blank">Baixar Node.js para Windows</a><br />

<a href="https://dev.mysql.com/downloads/windows/" target="_blank">Baixar MySQL para Windows</a><br />
O sistema roda em cima de um sistema Node.js para backend e React para frontend, conectando com um banco de dados MySQL.<br />
Possui um tela de envio de mensagens para Whatsapp e e-Mail.  Também tem uma  área de cadastramento de templates de mensagens, assim como uma área de edição de templates e listagem de templates, e-mails enviados e mensagens de Whatsapp enviados.
<br /><br /><br />
<strong>Criado por: </strong>Prof. Emerson Silva<a href='mailto://emerson.silva463@etec.sp.gov.br'>emerson.silva463@etec.sp.gov.br</a>



      </p>

      
    </div>
  );
}

export default App;