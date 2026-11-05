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
// Importa o módulo nativo fs (File System) para verificar a existência de pastas e arquivos
const fs = require('fs');
// Importa o módulo nativo os para capturar os endereços de IP da máquina
const os = require('os');

// Inicializa a aplicação Express
const app = express();

// Configura o Express para confiar em proxies reversos (essencial para Cloudflare Tunnel / Nginx em https://sema.emersonsilv.win)
app.set('trust proxy', true);

// Define a porta do servidor (lê da variável de ambiente PORT ou assume a porta 3010 por padrão)
const port = process.env.PORT || 3010;
// Define o endereço base do sistema
const BASE_URL = process.env.BASE_URL || 'https://sema.emersonsilv.win';

// Habilita o CORS permitindo o domínio oficial e origens locais da rede
app.use(cors({
  origin: [
    'https://sema.emersonsilv.win',
    'http://localhost:3000',
    'http://localhost:3010',
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // Permite IPs locais da faixa 192.168.x.x
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/      // Permite IPs locais da faixa 10.x.x.x
  ],
  credentials: true
}));

// Configura o Express para interpretar payloads de requisição no formato JSON
app.use(bodyParser.json());
// Configura o Express para interpretar dados enviados via formulários (urlencoded)
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================================
// VERIFICAÇÃO DE COMPORTAMENTO (DIST / AMBIENTE)
// ==========================================
const distPath = path.join(__dirname, 'dist');
const hasDistFolder = fs.existsSync(distPath);

// Verificador de comportamento do sistema
const sistemaComportamento = hasDistFolder ? 'SISTEMA DE PRODUÇÃO' : 'SISTEMA DE HOMOLOGAÇÃO';

if (hasDistFolder) {
  // Servir os arquivos estáticos da pasta "dist" do React (Se a pasta existir)
  app.use(express.static(distPath));
}

// Inicializa o SDK do Google Gen AI (lê automaticamente a chave GEMINI_API_KEY do arquivo .env)
const ai = new GoogleGenAI();
const aiStatusFuncional = !!ai; // Valida se a instância da IA foi carregada corretamente

// Cria o pool de conexões com o banco de dados MySQL utilizando as credenciais de configuração (Evita queda de conexão inativa)
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Executa a conexão oficial com o banco MySQL testando o Pool e valida se ocorreu algum erro
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco:', err);
  } else {
    console.log('✅ Conectado ao banco de dados MySQL via Pool (Banco encontrado com sucesso!).');
    connection.release(); // Libera a conexão de teste de volta para o Pool
  }
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
      
      // Limpa os listeners do socket antigo para evitar memory leak de sockets zumbis na memória
      if (activeSessions[userId].sock) {
          activeSessions[userId].sock.ev.removeAllListeners();
      }

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
      promptText += `\nAjuste/Iteração solicitada pelo usuário para esta nova versão: 
${iteracao}`;
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
  const { usuario_id, perfil_logado, usuario_logado_id, apenas_ativos } = req.query;
  let query = `SELECT t.*, u.login AS autor_login, u.nome AS autor_nome FROM templates t LEFT JOIN usuarios u ON t.usuario_id = u.id WHERE 1=1`;
  const params = [];

  // Se o solicitante não for admin, restringe a busca apenas aos templates do próprio usuário
  if (perfil_logado && perfil_logado !== 'admin') {
    if (!usuario_logado_id) return res.status(403).json({ message: 'Acesso negado.' });
    query += ' AND t.usuario_id = ?';
    params.push(usuario_logado_id);
  } else if (usuario_id) {
    // Se o admin passou um filtro específico de usuário via query string
    query += ' AND t.usuario_id = ?';
    params.push(usuario_id);
  }

  // Filtro opcional para retornar apenas templates ativos se solicitado
  if (apenas_ativos === 'true') {
    query += ' AND t.ativo = 1';
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

// Rota HTTP POST para envio de feedback/sugestões pelo formulário de Ajuda
app.post('/enviar-ajuda-feedback', async (req, res) => {
  const { nome, emailUsuario, mensagem } = req.body;
  if (!mensagem || !emailUsuario) {
    return res.status(400).json({ message: 'E-mail e mensagem são obrigatórios.' });
  }

  try {
    // Busca um usuário administrador ou remetente padrão no banco para puxar as credenciais do Gmail configuradas
    db.query('SELECT * FROM usuarios WHERE perfil = "admin" LIMIT 1', async (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ message: 'Nenhum administrador com configuração de e-mail encontrada.' });
      }

      const adminUser = results[0];
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: adminUser.gmail_user || adminUser.email,
          pass: adminUser.gmail_pass
        }
      });

      await transporter.sendMail({
        from: `"${nome || 'Usuário do Sistema'}" <${adminUser.gmail_user || adminUser.email}>`,
        to: 'emersonsilv@gmail.com',
        cc: 'emerson.silva463@etec.sp.gov.br',
        subject: `🛠️ [Feedback / Sugestão - Sistema SEMA] Enviado por: ${emailUsuario}`,
        text: `Nome: ${nome}\nE-mail de Contato: ${emailUsuario}\n\nMensagem / Sugestão:\n${mensagem}`
      });

      res.json({ message: 'Feedback enviado com sucesso para os desenvolvedores!' });
    });
  } catch (error) {
    console.error('Erro ao enviar feedback de ajuda:', error);
    res.status(500).json({ message: 'Erro ao enviar e-mail de feedback.' });
  }
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
app.post('/enviar-lote-streaming', async (req, res) => {
  const { contatos, templateId, usuario_id } = req.body;

  if (!contatos || !Array.isArray(contatos) || contatos.length === 0 || !templateId) {
    return res.status(400).json({ message: 'Lista de contatos e ID do template são obrigatórios.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Monitora se o cliente fechou a aba ou cancelou o disparo para abortar o loop
  let clienteConectado = true;
  req.on('close', () => {
    console.log('⚠️ Cliente fechou a conexão de streaming. Abortando envios...');
    clienteConectado = false;
  });

  db.query('SELECT * FROM usuarios WHERE id = ?', [usuario_id], async (errUser, userResults) => {
    if (errUser || userResults.length === 0) {
      sendEvent({ tipo: 'erro', mensagem: 'Usuário remetente não encontrado.' });
      return res.end();
    }

    const usuarioRemetente = userResults[0];
    
    const userTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: usuarioRemetente.gmail_user || usuarioRemetente.email,
        pass: usuarioRemetente.gmail_pass
      }
    });

    db.query('SELECT * FROM templates WHERE id = ?', [templateId], async (err, results) => {
      if (err || results.length === 0) {
        sendEvent({ tipo: 'erro', mensagem: 'Template não encontrado ou erro no banco.' });
        return res.end();
      }

      const template = results[0];
      const userId = usuario_id || template.usuario_id || null;
      const sockUsuario = activeSessions[usuario_id]?.sock;

      sendEvent({ tipo: 'inicio', total: contatos.length });

      for (let i = 0; i < contatos.length; i++) {
        // Se o cliente desconectar no meio do processo, o loop é interrompido
        if (!clienteConectado) {
            console.log('🛑 Disparo interrompido pelo usuário no contato: ' + i);
            break;
        }

        const contato = contatos[i];
        const nomeContato = contato.nome || 'Cliente';
        const emailContato = contato.email; 
        const tel1 = contato.telefone1 || contato.tel1;
        const tel2 = contato.telefone2 || contato.tel2;

        const mensagemPersonalizada = `Olá ${nomeContato} ${template.mensagem}`;

        sendEvent({ 
          tipo: 'progresso', 
          indice: i + 1, 
          total: contatos.length, 
          nome: nomeContato 
        });

        if (emailContato && usuarioRemetente.gmail_pass) {
          try {
            await userTransporter.sendMail({
              from: `"${usuarioRemetente.nome}" <${usuarioRemetente.gmail_user || usuarioRemetente.email}>`,
              to: emailContato,
              subject: template.assunto || 'Mensagem Importante',
              text: mensagemPersonalizada
            });

            await new Promise((resolve) => {
              const queryEmail = `INSERT INTO email (nome, email1, assunto, menssagem, usuario_id) VALUES (?, ?, ?, ?, ?)`;
              db.query(queryEmail, [nomeContato, emailContato, template.assunto, mensagemPersonalizada, userId], (err) => {
                  if (err) console.error("Erro ao inserir email no banco:", err);
                  resolve(); // Resolve mesmo com erro para não travar o loop
              });
            });

            sendEvent({ tipo: 'sucesso', canal: 'email', destinatario: emailContato, nome: nomeContato });
          } catch (eEmail) {
            sendEvent({ tipo: 'falha', canal: 'email', erro: eEmail.message, nome: nomeContato });
          }
        }

        if (tel1 && sockUsuario) {
          try {
            const jid1 = formatarNumeroWhatsApp(tel1);
            await sockUsuario.sendMessage(jid1, { text: mensagemPersonalizada });

            await new Promise((resolve) => {
              const queryWp1 = `INSERT INTO whatsapp (nome, tel1, menssagem, usuario_id) VALUES (?, ?, ?, ?)`;
              db.query(queryWp1, [nomeContato, tel1, mensagemPersonalizada, userId], (err) => {
                  if (err) console.error("Erro ao inserir wp1 no banco:", err);
                  resolve(); // Resolve mesmo com erro para não travar o loop
              });
            });

            sendEvent({ tipo: 'sucesso', canal: 'whatsapp1', destinatario: tel1, nome: nomeContato });
          } catch (eWp1) {
            sendEvent({ tipo: 'falha', canal: 'whatsapp1', erro: eWp1.message, nome: nomeContato });
          }
        }

        if (tel2 && String(tel2).trim() !== '' && sockUsuario) {
          try {
            const jid2 = formatarNumeroWhatsApp(tel2);
            await sockUsuario.sendMessage(jid2, { text: mensagemPersonalizada });

            await new Promise((resolve) => {
              const queryWp2 = `INSERT INTO whatsapp (nome, tel1, menssagem, usuario_id) VALUES (?, ?, ?, ?)`;
              db.query(queryWp2, [nomeContato, tel2, mensagemPersonalizada, userId], (err) => {
                  if (err) console.error("Erro ao inserir wp2 no banco:", err);
                  resolve(); // Resolve mesmo com erro para não travar o loop
              });
            });

            sendEvent({ tipo: 'sucesso', canal: 'whatsapp2', destinatario: tel2, nome: nomeContato });
          } catch (eWp2) {
            sendEvent({ tipo: 'falha', canal: 'whatsapp2', erro: eWp2.message, nome: nomeContato });
          }
        }

        if (i < contatos.length - 1) {
          const msEspera = tempoAleatorio(1.5, 4);
          const minutosCalculados = (msEspera / 60000).toFixed(2);
          
          sendEvent({ tipo: 'espera', minutos: minutosCalculados });
          await new Promise(resolve => setTimeout(resolve, msEspera));
        }
      }

      // Só envia o evento de "fim" se a conexão ainda estiver ativa
      if(clienteConectado){
          sendEvent({ tipo: 'fim' });
          res.end();
      }
    });
  });
});

// ==========================================
// ROTA CORINGA PARA O REACT ROUTER (DIST)
// ==========================================
// Deve ficar após as rotas de API e antes do app.listen, acionada somente se a pasta existir
if (hasDistFolder) {
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Inicializa o servidor Express escutando em 0.0.0.0 na porta especificada
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${port} (Acessível na rede e em ${BASE_URL})`);
  
  // ==========================================
  // VERIFICADOR DE COMPORTAMENTO & LOGS EXIGIDOS
  // ==========================================
  console.log(`🔍 [VERIFICADOR DE COMPORTAMENTO]: O sistema está rodando em modo: ${sistemaComportamento}`);
  console.log(`📊 [BANCO DE DADOS]: Conexão estabelecida com sucesso! Banco de dados encontrado.`);
  console.log(`🤖 [AGENTE DE IA]: A API do Agente de IA (Google Gen AI) está ${aiStatusFuncional ? 'funcionando corretamente' : 'com falha na inicialização'}.`);
  
  // Exibição das URLs com IPs e portas para conexão
  console.log(`🌐 [URLS DE CONEXÃO DISPONÍVEIS]:`);
  console.log(`   - Local:    http://localhost:${port}`);
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   - Rede (IP): http://${net.address}:${port}`);
      }
    }
  }
  console.log(`   - Domínio Base: ${BASE_URL}`);

  // Verificação detalhada da pasta Dist e modo de homologação/produção
  if (hasDistFolder) {
    console.log(`📁 [PASTA DIST]: Pasta 'dist' encontrada! Estamos em modo PRODUÇÃO (Servindo o frontend integrado).`);
  } else {
    console.log(`⚠️ [PASTA DIST]: Pasta 'dist' NÃO foi encontrada! Backend e frontend estão rodando separadamente e estamos em fase de HOMOLOGAÇÃO.`);
  }
});