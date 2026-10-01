// Carrega as variáveis de ambiente definidas no arquivo .env para process.env
require('dotenv').config();

// Importa o framework Express para criação do servidor web e gerenciamento de rotas
const express = require('express');
// Importa o middleware CORS para permitir requisições de diferentes origens (frontend)
const cors = require('cors');
// Importa o body-parser para interpretar o corpo das requisições HTTP em formato JSON ou URL-encoded
const bodyParser = require('body-parser');
// Importa a biblioteca mysql2 para conexão e manipulação do banco de dados MySQL
const mysql = require('mysql2');
// Importa a biblioteca bcrypt para criptografia e validação segura de senhas
const bcrypt = require('bcrypt');
// Importa o nodemailer para envio de e-mails via servidores SMTP (ex: Gmail)
const nodemailer = require('nodemailer');
// Importa funções do Baileys para gerenciar a conexão e autenticação com o WhatsApp
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
// Importa a biblioteca pino para gerenciamento de logs (usada para silenciar o output do Baileys)
const pino = require('pino');
// Importa o SDK oficial do Google Gen AI para interagir com o Gemini
const { GoogleGenAI } = require('@google/genai');
// Importa o módulo nativo path para manipulação de caminhos de diretórios e arquivos
const path = require('path');

// Inicializa a aplicação Express
const app = express();
// Define a porta do servidor (lê da variável de ambiente PORT ou assume a porta 3010 por padrão)
const port = process.env.PORT || 3010;

// Habilita o CORS em todas as rotas do Express
app.use(cors());
// Configura o Express para interpretar payloads de requisição no formato JSON
app.use(bodyParser.json());
// Configura o Express para interpretar dados enviados via formulários (urlencoded)
app.use(bodyParser.urlencoded({ extended: true }));

// Inicializa o SDK do Google Gen AI (lê automaticamente a chave GEMINI_API_KEY do arquivo .env)
const ai = new GoogleGenAI();

// Cria a conexão persistente com o banco de dados MySQL utilizando as credenciais de configuração
const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin@123',
  database: process.env.DB_NAME || 'wacursos',
  port: process.env.DB_PORT || 3306
});

// Executa a conexão oficial com o banco MySQL e valida se ocorreu algum erro
db.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco:', err);
    return;
  }
  console.log('✅ Conectado ao banco de dados MySQL.');
});

// ==========================================
// GERENCIADOR MULTI-SESSÃO WHATSAPP (BAILEYS)
// ==========================================
// Objeto global em memória para armazenar as sessões ativas de cada usuário: { [userId]: { sock, qr, status } }
const activeSessions = {}; 

// Função assíncrona responsável por inicializar e gerenciar a sessão do WhatsApp de um usuário específico
async function iniciarWhatsAppUsuario(userId, resQR = null) {
  // Define o diretório local onde serão salvos os arquivos de autenticação do Baileys para este usuário
  const sessionDir = path.join(__dirname, `auth_info_user_${userId}`);
  
  // Carrega ou cria o estado de autenticação multi-arquivo para o diretório do usuário
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  // Cria a instância do socket do WhatsApp via Baileys com logs silenciados
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  });

  // Se a sessão para este usuário ainda não existir no objeto global, inicializa um objeto vazio
  if (!activeSessions[userId]) {
    activeSessions[userId] = {};
  }
  
  // Atribui o socket criado, define o status inicial como 'conectando' e limpa o QR code anterior
  activeSessions[userId].sock = sock;
  activeSessions[userId].status = 'conectando';
  activeSessions[userId].qr = null;

  // Escuta os eventos de atualização de conexão do WhatsApp
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Se um novo QR Code for gerado pelo Baileys
    if (qr) {
      activeSessions[userId].qr = qr;
      activeSessions[userId].status = 'aguardando_scan';
      // Se houver uma requisição HTTP pendente aguardando o QR, responde imediatamente com ele
      if (resQR && !resQR.headersSent) {
        resQR.json({ qr, status: 'aguardando_scan' });
        resQR = null;
      }
    }

    // Se a conexão for fechada
    if (connection === 'close') {
      // Verifica se o fechamento não foi um logout intencional para decidir se deve reconectar
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      activeSessions[userId].status = 'desconectado';
      activeSessions[userId].qr = null;
      console.log(`🔄 Conexão WhatsApp do usuário ${userId} fechada. Reconectando...`, shouldReconnect);
      // Se puder reconectar, chama a função recursivamente
      if (shouldReconnect) {
        iniciarWhatsAppUsuario(userId);
      }
    } else if (connection === 'open') {
      // Se a conexão for aberta com sucesso (escaneado e autenticado)
      activeSessions[userId].status = 'conectado';
      activeSessions[userId].qr = null;
      console.log(`📱 WhatsApp do usuário ${userId} conectado com sucesso via Baileys!`);
    }
  });

  // Escuta o evento de atualização de credenciais e salva automaticamente no disco
  sock.ev.on('creds.update', saveCreds);
  // Retorna o socket instanciado
  return sock;
}

// Rota HTTP GET para solicitar ou iniciar a conexão do WhatsApp de um ID de usuário específico
app.get('/whatsapp/conectar/:id', async (req, res) => {
  const { id } = req.params;
  
  // Se a sessão já estiver conectada, retorna o status de conectado
  if (activeSessions[id] && activeSessions[id].status === 'conectado') {
    return res.json({ status: 'conectado', message: 'WhatsApp já está conectado!' });
  }

  // Se já existir um QR Code gerado em memória, retorna ele para o frontend
  if (activeSessions[id] && activeSessions[id].qr) {
    return res.json({ qr: activeSessions[id].qr, status: activeSessions[id].status });
  }

  // Caso contrário, inicia uma nova sessão de conexão passando o objeto de resposta HTTP
  iniciarWhatsAppUsuario(id, res);
});

// Rota HTTP GET para consultar em tempo real o status da conexão e o QR Code do usuário
app.get('/whatsapp/status/:id', (req, res) => {
  const { id } = req.params;
  const session = activeSessions[id];
  // Retorna o status atual (conectado, desconectado, aguardando_scan) e o QR Code se houver
  res.json({
    status: session ? session.status : 'desconectado',
    qr: session ? session.qr : null
  });
});

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
// Formata o número de telefone bruto para o padrão exigido pelo WhatsApp (JID)
function formatarNumeroWhatsApp(numero) {
  let limpo = String(numero).replace(/\D/g, ''); // Remove tudo que não for dígito numérico
  if (!limpo.startsWith('55')) {
    limpo = '55' + limpo; // Adiciona o DDI do Brasil (55) caso não tenha
  }
  return limpo + '@s.whatsapp.net'; // Retorna o JID estruturado
}

// Calcula um tempo de espera aleatório (em milissegundos) entre disparos para evitar bloqueios
function tempoAleatorio(minMinutos, maxMinutos) {
  const minMs = minMinutos * 60 * 1000;
  const maxMs = maxMinutos * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// ==========================================
// ROTAS DE INTELIGÊNCIA ARTIFICIAL (GEMINI)
// ==========================================
// Rota HTTP POST para gerar opções de templates institucionais utilizando a IA do Gemini
app.post('/gerar-template-ia', async (req, res) => {
  const { motivo, curso, publicoAlvo, objetivo, detalhes, iteracao } = req.body;

  try {
    // Monta o prompt textual estruturado contendo todas as diretrizes enviadas pelo usuário
    let promptText = `
      Você é um assistente de IA especialista em copywriting e marketing educacional.
      Sua tarefa é criar 3 (três) opções de templates de mensagens (assunto e mensagem) voltados para comunicação institucional.
      
      Diretrizes da mensagem:
      - Motivo: ${motivo}
      - Curso Alvo: ${curso || 'Não especificado'}
      - Público-Alvo: ${publicoAlvo || 'Geral'}
      - Objetivo principal: ${objetivo}
      - Detalhes importantes / Contexto: ${detalhes}
    `;

    // Se houver uma instrução de ajuste/refinamento posterior, adiciona ao prompt
    if (iteracao) {
      promptText += `\n- Ajuste/Iteração solicitada pelo usuário para esta nova versão: ${iteracao}`;
    }

    // Define a regra estrita de retorno em formato JSON puro
    promptText += `
      IMPORTANTE: Retorne APENAS um objeto JSON válido (sem blocos de código markdown adicionais como \`\`\`json) com a seguinte estrutura exata:
      {
        "opcoes": [
          { "assunto": "...", "mensagem": "..." },
          { "assunto": "...", "mensagem": "..." },
          { "assunto": "...", "mensagem": "..." }
        ]
      }
    `;

    // Envia a solicitação de geração de conteúdo para o modelo Gemini configurado
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: promptText,
    });

    // Trata e limpa o texto retornado pela IA para garantir que seja um JSON válido
    let textoResposta = response.text.trim();
    textoResposta = textoResposta.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

    // Converte a string JSON limpa em objeto JavaScript e envia como resposta HTTP
    const dadosJson = JSON.parse(textoResposta);
    res.json(dadosJson);

  } catch (error) {
    console.error('Erro ao gerar conteúdo com a IA:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com o modelo de IA.' });
  }
});

// ==========================================
// ROTAS DE USUÁRIOS
// ==========================================
// Rota HTTP POST para cadastrar um novo usuário no sistema
app.post('/usuarios', async (req, res) => {
  const { nome, login, password, perfil, email, gmail_user, gmail_pass } = req.body;
  // Valida se os campos essenciais foram informados
  if (!login || !password || !email) {
    return res.status(400).json({ message: 'Login, senha e e-mail são obrigatórios.' });
  }

  try {
    // Aplica o hash de criptografia (bcrypt) na senha antes de salvar no banco
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO usuarios (nome, login, password, perfil, email, gmail_user, gmail_pass) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    // Executa a query de inserção no banco de dados MySQL
    db.query(query, [nome || 'Usuário', login, hashedPassword, perfil || 'operador', email, gmail_user || email, gmail_pass || null], (err, result) => {
      if (err) return res.status(500).json({ message: 'Erro ao cadastrar usuário.', error: err });
      res.status(201).json({ message: 'Usuário cadastrado com sucesso!', id: result.insertId });
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao processar senha.', error: err });
  }
});

// Rota HTTP GET para listar todos os usuários cadastrados (sem expor senhas)
app.get('/usuarios', (req, res) => {
  db.query('SELECT id, nome, login, perfil, email, gmail_user FROM usuarios ORDER BY id', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Rota HTTP PUT para atualizar dados de perfil, credenciais de e-mail ou senha de um usuário
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, perfil, password, login, gmail_user, gmail_pass } = req.body;
  if (!nome || !email) return res.status(400).json({ message: 'Nome e e-mail são obrigatórios.' });

  try {
    // Monta a query base de atualização dinâmica
    let query = 'UPDATE usuarios SET nome = ?, email = ?, gmail_user = ?';
    let params = [nome, email, gmail_user || email];

    // Se uma nova senha de app do Gmail foi informada, adiciona à query
    if (gmail_pass && gmail_pass.trim() !== '') {
      query += ', gmail_pass = ?';
      params.push(gmail_pass);
    }
    // Adiciona login se fornecido
    if (login) {
      query += ', login = ?';
      params.push(login);
    }
    // Adiciona perfil se fornecido
    if (perfil) {
      query += ', perfil = ?';
      params.push(perfil);
    }
    // Se uma nova senha do sistema foi informada, gera o hash e adiciona à query
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    // Executa a atualização no banco de dados
    db.query(query, params, (err) => {
      if (err) return res.status(500).json({ message: 'Erro ao atualizar usuário.', error: err });
      res.json({ message: 'Perfil atualizado com sucesso!' });
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao processar requisição.', error: err });
  }
});

// ==========================================
// ROTAS DE TEMPLATES
// ==========================================
// Rota HTTP POST para inserir um novo template de mensagem
app.post('/insert', (req, res) => {
  const { ativo, assunto, mensagem, usuario_id } = req.body;
  const query = `INSERT INTO templates (ativo, assunto, mensagem, usuario_id) VALUES (?, ?, ?, ?)`;
  db.query(query, [ativo, assunto, mensagem, usuario_id || null], (err, results) => {
    if (err) return res.status(500).json({ message: 'Erro ao inserir dados no banco!', error: err });
    // Busca o template recém-inserido para retornar os dados completos ao cliente
    db.query('SELECT * FROM templates WHERE id = ?', [results.insertId], (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Template inserido com sucesso!', data: result[0] });
    });
  });
});

// Rota HTTP GET para listar templates aplicando restrições de perfil (Admin vê tudo, operador vê os seus)
app.get('/templates', (req, res) => {
  const { usuario_id, perfil_logado, usuario_logado_id } = req.query;
  let query = `SELECT t.*, u.login AS autor_login, u.nome AS autor_nome FROM templates t LEFT JOIN usuarios u ON t.usuario_id = u.id`;
  const params = [];

  // Se o solicitante não for admin, restringe a busca apenas aos templates do próprio usuário
  if (perfil_logado && perfil_logado !== 'admin') {
    if (!usuario_logado_id) return res.status(403).json({ message: 'Acesso negado.' });
    query += ' WHERE t.usuario_id = ?';
    params.push(usuario_logado_id);
  } else if (usuario_id) {
    // Se o admin passou um filtro específico de usuário via query string
    query += ' WHERE t.usuario_id = ?';
    params.push(usuario_id);
  }

  query += ' ORDER BY t.id';
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Rota HTTP GET para buscar um template específico pelo ID
app.get('/template/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT t.*, u.login AS autor_login, u.nome AS autor_nome FROM templates t LEFT JOIN usuarios u ON t.usuario_id = u.id WHERE t.id = ?`;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Template não encontrado' });
    res.json(results[0]);
  });
});

// Rota HTTP PUT para atualizar um template existente pelo ID
app.put('/update/:id', (req, res) => {
  const { id } = req.params;
  const { ativo, assunto, mensagem, usuario_id } = req.body;
  db.query('UPDATE templates SET ativo = ?, assunto = ?, mensagem = ?, usuario_id = ? WHERE id = ?', [ativo, assunto, mensagem, usuario_id || null, id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Template atualizado com sucesso!' });
  });
});

// ==========================================
// ROTAS DE HISTÓRICO (EMAIL E WHATSAPP)
// ==========================================
// Rota HTTP POST para registrar o histórico de envio de e-mail no banco
app.post('/email', (req, res) => {
  const { nome, email1, email2, assunto, menssagem, usuario_id } = req.body;
  db.query(`INSERT INTO email (nome, email1, email2, assunto, menssagem, usuario_id) VALUES (?, ?, ?, ?, ?, ?)`, [nome, email1, email2, assunto, menssagem, usuario_id || null], (err, results) => {
    if (err) return res.status(500).json({ message: 'Erro ao inserir email!', error: err });
    res.json({ message: 'Email registrado com sucesso!', id: results.insertId });
  });
});

// Rota HTTP GET para listar o histórico de e-mails enviados com filtro por perfil
app.get('/listarEmail', (req, res) => {
  const { usuario_id, perfil_logado, usuario_logado_id } = req.query;
  let query = `SELECT e.*, u.login AS autor_login, u.nome AS autor_nome FROM email e LEFT JOIN usuarios u ON e.usuario_id = u.id`;
  const params = [];

  if (perfil_logado && perfil_logado !== 'admin') {
    if (!usuario_logado_id) return res.status(403).json({ message: 'Acesso negado.' });
    query += ' WHERE e.usuario_id = ?';
    params.push(usuario_logado_id);
  } else if (usuario_id) {
    query += ' WHERE e.usuario_id = ?';
    params.push(usuario_id);
  }

  query += ' ORDER BY e.data DESC';
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send('Erro ao listar mensagens');
    res.json(results);
  });
});

// Rota HTTP POST para registrar o histórico de envio de WhatsApp no banco
app.post('/whatsapp', (req, res) => {
  const { nome, tel1, tel2, menssagem, usuario_id } = req.body;
  db.query(`INSERT INTO whatsapp (nome, tel1, tel2, menssagem, usuario_id) VALUES (?, ?, ?, ?, ?)`, [nome, tel1, tel2, menssagem, usuario_id || null], (err, results) => {
    if (err) return res.status(500).json({ message: 'Erro ao inserir whatsapp!', error: err });
    res.json({ message: 'WhatsApp registrado com sucesso!', id: results.insertId });
  });
});

// Rota HTTP GET para listar o histórico de disparos de WhatsApp com filtro por perfil
app.get('/listarWhatsapp', (req, res) => {
  const { usuario_id, perfil_logado, usuario_logado_id } = req.query;
  let query = `SELECT w.*, u.login AS autor_login, u.nome AS autor_nome FROM whatsapp w LEFT JOIN usuarios u ON w.usuario_id = u.id`;
  const params = [];

  if (perfil_logado && perfil_logado !== 'admin') {
    if (!usuario_logado_id) return res.status(403).json({ message: 'Acesso negado.' });
    query += ' WHERE w.usuario_id = ?';
    params.push(usuario_logado_id);
  } else if (usuario_id) {
    query += ' WHERE w.usuario_id = ?';
    params.push(usuario_id);
  }

  query += ' ORDER BY w.data DESC';
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send('Erro ao listar mensagens');
    res.json(results);
  });
});

// ==========================================
// ROTA DE DISPARO INTELIGENTE COM STREAMING (SSE)
// ==========================================
// Rota HTTP POST que executa disparos em lote utilizando Server-Sent Events (SSE) para feedback em tempo real
app.post('/enviar-lote-streaming', async (req, res) => {
  const { contatos, templateId, usuario_id } = req.body;

  // Valida se os dados obrigatórios foram enviados na requisição
  if (!contatos || !Array.isArray(contatos) || contatos.length === 0 || !templateId) {
    return res.status(400).json({ message: 'Lista de contatos e ID do template são obrigatórios.' });
  }

  // Configura os headers HTTP para manter uma conexão de streaming aberta com o cliente
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Função auxiliar para enviar eventos estruturados (SSE) de volta ao frontend
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Busca no banco de dados as credenciais do usuário remetente responsável pelo disparo
  db.query('SELECT * FROM usuarios WHERE id = ?', [usuario_id], async (errUser, userResults) => {
    if (errUser || userResults.length === 0) {
      sendEvent({ tipo: 'erro', mensagem: 'Usuário remetente não encontrado.' });
      return res.end();
    }

    const usuarioRemetente = userResults[0];
    
    // Configura o transporte do Nodemailer dinamicamente usando a conta de e-mail e senha de app do usuário
    const userTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: usuarioRemetente.gmail_user || usuarioRemetente.email,
        pass: usuarioRemetente.gmail_pass
      }
    });

    // Busca o template selecionado no banco de dados
    db.query('SELECT * FROM templates WHERE id = ?', [templateId], async (err, results) => {
      if (err || results.length === 0) {
        sendEvent({ tipo: 'erro', mensagem: 'Template não encontrado ou erro no banco.' });
        return res.end();
      }

      const template = results[0];
      const userId = usuario_id || template.usuario_id || null;
      // Recupera a instância do socket do Baileys correspondente à sessão ativa do usuário
      const sockUsuario = activeSessions[usuario_id]?.sock;

      // Emite o evento inicial informando o total de contatos da lista
      sendEvent({ tipo: 'inicio', total: contatos.length });

      // Loop iterativo para processar o envio para cada contato da lista
      for (let i = 0; i < contatos.length; i++) {
        const contato = contatos[i];
        const nomeContato = contato.nome || 'Cliente';
        const emailContato = contato.email; 
        const tel1 = contato.telefone1 || contato.tel1;
        const tel2 = contato.telefone2 || contato.tel2;

        // Monta o texto final da mensagem personalizada com o nome do contato
        const mensagemPersonalizada = `Olá ${nomeContato} ${template.mensagem}`;

        // Emite o evento de progresso indicando qual contato está sendo processado no momento
        sendEvent({ 
          tipo: 'progresso', 
          indice: i + 1, 
          total: contatos.length, 
          nome: nomeContato 
        });

        // Se o contato possui e-mail e o usuário remetente cadastrou a senha de app, dispara o e-mail
        if (emailContato && usuarioRemetente.gmail_pass) {
          try {
            await userTransporter.sendMail({
              from: `"${usuarioRemetente.nome}" <${usuarioRemetente.gmail_user || usuarioRemetente.email}>`,
              to: emailContato,
              subject: template.assunto || 'Mensagem Importante',
              text: mensagemPersonalizada
            });

            // Registra o envio bem-sucedido de e-mail no banco de dados
            await new Promise((resolve) => {
              const queryEmail = `INSERT INTO email (nome, email1, assunto, menssagem, usuario_id) VALUES (?, ?, ?, ?, ?)`;
              db.query(queryEmail, [nomeContato, emailContato, template.assunto, mensagemPersonalizada, userId], () => resolve());
            });

            sendEvent({ tipo: 'sucesso', canal: 'email', destinatario: emailContato, nome: nomeContato });
          } catch (eEmail) {
            sendEvent({ tipo: 'falha', canal: 'email', erro: eEmail.message, nome: nomeContato });
          }
        }

        // Se o contato possui telefone 1 e a sessão do Baileys do usuário está conectada, dispara o WhatsApp 1
        if (tel1 && sockUsuario) {
          try {
            const jid1 = formatarNumeroWhatsApp(tel1);
            await sockUsuario.sendMessage(jid1, { text: mensagemPersonalizada });

            // Registra o envio de WhatsApp 1 no banco de dados
            await new Promise((resolve) => {
              const queryWp1 = `INSERT INTO whatsapp (nome, tel1, menssagem, usuario_id) VALUES (?, ?, ?, ?)`;
              db.query(queryWp1, [nomeContato, tel1, mensagemPersonalizada, userId], () => resolve());
            });

            sendEvent({ tipo: 'sucesso', canal: 'whatsapp1', destinatario: tel1, nome: nomeContato });
          } catch (eWp1) {
            sendEvent({ tipo: 'falha', canal: 'whatsapp1', erro: eWp1.message, nome: nomeContato });
          }
        }

        // Se o contato possui telefone 2 preenchido, dispara o WhatsApp 2 secundário
        if (tel2 && String(tel2).trim() !== '' && sockUsuario) {
          try {
            const jid2 = formatarNumeroWhatsApp(tel2);
            await sockUsuario.sendMessage(jid2, { text: mensagemPersonalizada });

            // Registra o envio de WhatsApp 2 no banco de dados
            await new Promise((resolve) => {
              const queryWp2 = `INSERT INTO whatsapp (nome, tel1, menssagem, usuario_id) VALUES (?, ?, ?, ?)`;
              db.query(queryWp2, [nomeContato, tel2, mensagemPersonalizada, userId], () => resolve());
            });

            sendEvent({ tipo: 'sucesso', canal: 'whatsapp2', destinatario: tel2, nome: nomeContato });
          } catch (eWp2) {
            sendEvent({ tipo: 'falha', canal: 'whatsapp2', erro: eWp2.message, nome: nomeContato });
          }
        }

        // Se não for o último contato da lista, aplica uma pausa aleatória para evitar banimento por spam
        if (i < contatos.length - 1) {
          const msEspera = tempoAleatorio(1.5, 4); // Intervalo randômico entre 1.5 e 4 minutos
          const minutosCalculados = (msEspera / 60000).toFixed(2);
          
          sendEvent({ tipo: 'espera', minutos: minutosCalculados });
          await new Promise(resolve => setTimeout(resolve, msEspera));
        }
      }

      // Emite o evento finalizando o processamento do lote
      sendEvent({ tipo: 'fim' });
      res.end();
    });
  });
});

// Inicializa o servidor Express escutando na porta especificada
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});