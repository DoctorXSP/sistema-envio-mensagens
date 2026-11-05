import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CONFIG_REDE } from './config';
import './App.css';

export default function Ajuda() {
  const location = useLocation();
  const navigate = useNavigate();

  // Estados para o formulário de sugestões e reclamações
  const [nome, setNome] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [mensagemFeedback, setMensagemFeedback] = useState('');
  const [statusEnvio, setStatusEnvio] = useState({ texto: '', tipo: '' });
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);

  // Efeito para rolar automaticamente até a seção correspondente ao hash da URL
  useEffect(() => {
    if (location.hash) {
      const elemento = document.getElementById(location.hash.replace('#', ''));
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  // Função para enviar o feedback direto para o e-mail do administrador
  const handleEnviarFeedback = async (e) => {
    e.preventDefault();
    setEnviandoFeedback(true);
    setStatusEnvio({ texto: '', tipo: '' });

    try {
      const response = await axios.post(`${CONFIG_REDE.URL_BACKEND}/enviar-ajuda-feedback`, {
        nome,
        emailUsuario,
        mensagem: mensagemFeedback
      });

      setStatusEnvio({ texto: response.data.message || 'Mensagem enviada com sucesso!', tipo: 'sucesso' });
      setNome('');
      setEmailUsuario('');
      setMensagemFeedback('');
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      setStatusEnvio({ texto: 'Erro ao enviar mensagem. Verifique se há remetente configurado no sistema.', tipo: 'erro' });
    } finally {
      setEnviandoFeedback(false);
    }
  };

  // Padrão visual dos botões de ação inferiores: Vermelho, fonte branca em negrito, borderRadius de 15px
  const estiloBotaoAcao = {
    display: 'inline-block',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '5px',
    textDecoration: 'none',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
    transition: 'opacity 0.2s'
  };

  return (
    <div className="container" style={{ maxWidth: '850px', margin: '30px auto', textAlign: 'left', lineHeight: '1.3', color: 'white' }}>
      <h2 className="titulo" style={{ textAlign: 'center', marginBottom: '10px' }}>📖 Manual de Uso e Central de Ajuda</h2>
      
      <p style={{ color: '#cbd5e1', textAlign: 'center', marginBottom: '30px' }}>
        Guia prático para reduzir sua curva de aprendizado e utilizar o Sistema de Envio de Mensagens com total eficiência.
      </p>

      {/* Sumário Organizado em Tópicos (Apenas textos brancos sem sublinhado em formato de link puro) */}
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #3b82f6' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#38bdf8' }}>🔍 Ir direto para a seção:</h4>
        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><a href="#home" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>1. Página Inicial (Home)</a></li>
          <li><a href="#enviar" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>- Envio Individual (WhatsApp e E-mail)</a></li>
          <li><a href="#enviar-lote" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>- 3. Envio em Lote (Planilha e Anti-Spam)</a></li>
          <li><a href="#templates" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>- 4. Gerenciamento de Templates & Inteligência Artificial (IA)</a></li>
          <li><a href="#historico" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>- 5. Listas de E-mails e WhatsApp Enviados</a></li>
          <li><a href="#perfil" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>- 6. Editar Perfil & Conexão Baileys / Gmail</a></li>
          <li><a href="#suporte" style={{ color: '#ffffff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>- 7. Sugestões de Funcionalidades & Reclamações</a></li>
        </ul>
      </div>

      {/* Seção 1: Home / Página de Entrada */}
      <section id="home" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>🏠 1. Página Inicial (Home)</h3>
        <p style={{ color: '#cbd5e1' }}>
          Tela de boas-vindas do sistema. Nela você encontra atalhos para download dos aplicativos essenciais (WhatsApp Desktop e Microsoft Outlook). O sistema opera integrando o Node.js no backend, React no frontend e banco de dados MySQL.
        </p>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vamos começar a usar esse recurso agora clicando no botão ao lado:</span>
          <button onClick={() => navigate('/')} style={estiloBotaoAcao}>Acessar Home</button>
        </div>
      </section>

      {/* Seção 2: Envio Individual */}
      <section id="enviar" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>📤 2. Envio Individual</h3>
        <p style={{ color: '#cbd5e1' }}>
          Permite disparar mensagens para um único contato. Regras importantes desta tela:
        </p>
        <ul style={{ color: '#cbd5e1', fontSize: '14px', paddingLeft: '20px', lineHeight: '1.4' }}>
          <li><b>Templates:</b> Serão mostrados no select <u>apenas os templates ativos</u>. Caso precise ativar um template, vá na listagem de templates e clique em editar.</li>
          <li><b>WhatsApp:</b> Pode ser disparado para um ou dois números ao mesmo tempo (basta preencher os campos). Você pode colar números com parênteses ou hífens (ex: <i>(11) 99999-9999</i>); o próprio sistema limpa e formata para o envio. Ao clicar, o navegador tentará abrir o aplicativo instalado; <u>aconselhamos ignorar e usar o WhatsApp no próprio navegador</u>. Se o número não possuir WhatsApp associado, o próprio aplicativo te avisará.</li>
          <li><b>E-mail:</b> Só são aceitos e-mails válidos no formato correto (ex: <i>usuario@dominio.com</i>). Você pode disparar para dois e-mails simultaneamente utilizando o segundo campo como cópia (CC). É necessário possuir um cliente de e-mail configurado no computador (recomendamos o <b>Outlook</b>).</li>
        </ul>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vamos começar a usar esse recurso agora clicando no botão ao lado:</span>
          <button onClick={() => navigate('/enviar')} style={estiloBotaoAcao}>Ir para Envio</button>
        </div>
      </section>

      {/* Seção 3: Envio em Lote */}
      <section id="enviar-lote" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>🚀 3. Envio em Lote (Planilha)</h3>
        <p style={{ color: '#cbd5e1' }}>
          Ideal para campanhas automatizadas via planilha (CSV ou XLSX). O sistema verifica automaticamente se existem dados preenchidos nas colunas de telefone e e-mail antes de disparar.
        </p>
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #f59e0b', margin: '10px 0', fontSize: '13px', color: '#fde68a', lineHeight: '1.4' }}>
          ⚠️ <b>Aviso Importante sobre Anti-Spam:</b> O envio automatizado utilizará um <u>tempo irregular (aleatório) entre as mensagens</u> para tentar simular comportamento humano e evitar que o WhatsApp detecte o uso de API não oficial e venha a banir o número. Lembramos que <b>não somos responsáveis</b> por eventuais detecções ou banimentos feitos pelos algoritmos do WhatsApp; use por sua conta e risco.
        </div>
        <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
          <b>Requisito obrigatório para funcionar:</b> É preciso conectar o WhatsApp ao sistema via Baileys (gerando o QR-Code na aba Editar Perfil) e configurar as credenciais do Gmail.
        </p>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vamos começar a usar esse recurso agora clicando no botão ao lado:</span>
          <button onClick={() => navigate('/enviar-lote')} style={estiloBotaoAcao}>Ir para Envio em Lote</button>
        </div>
      </section>

      {/* Seção 4: Templates e IA */}
      <section id="templates" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>📝 4. Gerenciamento de Templates & IA</h3>
        <p style={{ color: '#cbd5e1' }}>
          Você pode cadastrar e editar modelos manualmente, ou usar o recurso de <b>Inteligência Artificial (IA)</b>. Preenchendo o motivo, curso, público-alvo e objetivo, a IA redige o template e o assunto baseando-se em técnicas avançadas de Marketing.
        </p>
        <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
          Como a IA não sabe exatamente qual o tom exato de conversa que você deseja, <u>ela fornece 3 amostras diferentes</u> para você escolher a que melhor se adapta à sua realidade. Basta selecionar a sua preferida e clicar em salvar.
        </p>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vamos começar a usar esse recurso agora clicando no botão ao lado:</span>
          <button onClick={() => navigate('/lista-templates')} style={estiloBotaoAcao}>Ver Templates</button>
        </div>
      </section>

      {/* Seção 5: Listas e Histórico */}
      <section id="historico" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>📊 5. Listas de E-mails e WhatsApp Enviados</h3>
        <p style={{ color: '#cbd5e1' }}>
          Nesta seção você pode consultar todas as mensagens enviadas pelo sistema. <b>Se você clicar em qualquer linha da tabela, uma janela (modal) se abrirá mostrando o conteúdo completo</b> do que foi enviado. Você também pode utilizar os filtros disponíveis na tela para organizar e localizar registros com facilidade.
        </p>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vamos começar a usar esse recurso agora clicando no botão ao lado:</span>
          <button onClick={() => navigate('/lista-whatsapp')} style={estiloBotaoAcao}>Ver Histórico WhatsApp</button>
        </div>
      </section>

      {/* Seção 6: Perfil e Conexão WhatsApp */}
      <section id="perfil" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>📱 6. Editar Perfil & Conexão Baileys</h3>
        <p style={{ color: '#cbd5e1' }}>
          Aqui você pode atualizar seu nome, e-mail e alterar a senha de acesso ao sistema. É também nesta tela que você conecta o WhatsApp (gerando o QR-code) e configura o envio automático de e-mails.
        </p>
        
        {/* Passo a passo do Gmail */}
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: '#0f172a', padding: '12px', borderRadius: '6px', marginTop: '10px', border: '1px solid #334155', lineHeight: '1.4' }}>
          💡 <b>Passo a passo para obter sua Senha de App do Gmail (Necessário para envio de e-mail):</b><br/>
          1. Acesse sua Conta Google (<code>myaccount.google.com</code>) e certifique-se de que a <strong>Verificação em Duas Etapas</strong> está ativada.<br/>
          2. Na barra de pesquisa da Conta Google, digite <strong>Senhas de app</strong> (ou vá em Segurança &gt; Acesso ao Google &gt; Senhas de app).<br/>
          3. Digite um nome para identificação (ex: <em>Sistema de Disparos</em>) e clique em <strong>Gerar</strong>.<br/>
          4. Copie a senha de 16 caracteres gerada e cole no campo <em>Senha de App do Gmail</em> na sua tela de perfil.
        </div>
        <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vamos começar a usar esse recurso agora clicando no botão ao lado:</span>
          <button onClick={() => navigate('/editar-perfil')} style={estiloBotaoAcao}>Ir para Editar Perfil</button>
        </div>
      </section>

      {/* Seção 7: Suporte e Sugestões */}
      <section id="suporte" style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155', scrollMarginTop: '20px' }}>
        <h3 style={{ color: '#38bdf8' }}>🛠️ 7. Sugestões de Funcionalidades & Reclamações</h3>
        <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '15px' }}>
          Encontrou algum problema ou tem uma ideia para melhorar o sistema? Preencha o formulário abaixo. Sua mensagem será enviada diretamente para os desenvolvedores (<code>emersonsilv@gmail.com</code> com cópia para <code>emerson.silva463@etec.sp.gov.br</code>).
        </p>

        {statusEnvio.texto && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: statusEnvio.tipo === 'sucesso' ? '#d4edda' : '#f8d7da', color: statusEnvio.tipo === 'sucesso' ? '#155724' : '#721c24' }}>
            {statusEnvio.texto}
          </div>
        )}

        <form onSubmit={handleEnviarFeedback}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Seu Nome</label>
          <input 
            type="text" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)} 
            placeholder="Digite seu nome..." 
            required 
            style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Seu E-mail de Contato</label>
          <input 
            type="email" 
            value={emailUsuario} 
            onChange={(e) => setEmailUsuario(e.target.value)} 
            placeholder="seuemail@dominio.com" 
            required 
            style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Sua Sugestão ou Reclamação</label>
          <textarea 
            rows="4" 
            value={mensagemFeedback} 
            onChange={(e) => setMensagemFeedback(e.target.value)} 
            placeholder="Descreva detalhadamente a funcionalidade desejada ou o problema encontrado..." 
            required 
            style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '4px', boxSizing: 'border-box' }}
          />

          <button 
            type="submit" 
            disabled={enviandoFeedback}
            style={estiloBotaoAcao}
          >
            {enviandoFeedback ? 'Enviando...' : 'Enviar Feedback para os Desenvolvedores 📨'}
          </button>
        </form>
      </section>

      {/* Botão de Retorno Vermelho */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <Link to="/" style={estiloBotaoAcao}>
          Voltar para a Página Inicial
        </Link>
      </div>
    </div>
  );
}