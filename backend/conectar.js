// Importa as funções principais da biblioteca Baileys (@whiskeysockets/baileys) para gerenciar o socket, o estado de autenticação e os motivos de desconexão
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
// Importa a biblioteca pino para gerenciamento de logs (utilizada aqui para silenciar o output interno do Baileys)
const pino = require('pino');
// Importa a biblioteca qrcode-terminal para renderizar o QR Code de forma legível e sem bugs diretamente no terminal
const qrcode = require('qrcode-terminal');

// Função assíncrona principal responsável por iniciar o processo de autenticação via terminal
async function iniciarAutenticacao() {
    console.log('🔄 Iniciando processo de autenticação do WhatsApp...');
    
    // Configura o gerenciador de estado de autenticação multi-arquivo salvando os dados na pasta 'auth_info_baileys'
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    // Cria e configura a instância do socket de conexão com o WhatsApp
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Desativa o gerador nativo do Baileys para utilizarmos o 'qrcode-terminal' de forma customizada
        logger: pino({ level: 'silent' }) // Silencia os logs técnicos desnecessários no console
    });

    // Escuta o evento de atualização de conexão do WhatsApp para capturar o QR Code e o status
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Se a propriedade 'qr' estiver presente, significa que um novo QR Code foi gerado
        if (qr) {
            console.log('\n📲 Leia o QR Code abaixo com o seu WhatsApp:\n');
            // Renderiza o QR Code em formato compacto diretamente no terminal do Node.js
            qrcode.generate(qr, { small: true });
        }
        
        // Se a conexão for aberta com sucesso (após a leitura do QR Code pelo celular)
        if (connection === 'open') {
            console.log('\n✅ WhatsApp autenticado e conectado com sucesso!');
            console.log('📁 Os dados da sessão foram salvos na pasta "auth_info_baileys".');
            console.log('Pode fechar este terminal (Ctrl+C) e rodar o seu "node server.js" normalmente.\n');
            process.exit(0); // Encerra o script de terminal de forma limpa e segura
        }
        
        // Se a conexão for fechada por algum motivo
        if (connection === 'close') {
            // Verifica se o motivo do fechamento não foi um logout intencional (para decidir se tenta reconectar)
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 Conexão fechada. Tentando reconectar...', shouldReconnect);
            
            if (shouldReconnect) {
                // Se puder reconectar, reinicia o processo de autenticação recursivamente
                iniciarAutenticacao();
            } else {
                // Caso tenha ocorrido um logout definitivo, orienta o usuário a limpar a pasta de sessão
                console.log('❌ Sessão encerrada. Apague a pasta "auth_info_baileys" e tente novamente.');
            }
        }
    });

    // Escuta o evento de alteração de credenciais e dispara a função para salvá-las automaticamente em disco
    sock.ev.on('creds.update', saveCreds);
}

// Dispara a execução da função principal de autenticação ao rodar o arquivo
iniciarAutenticacao();