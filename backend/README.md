# 🚀 Sistema de Envio de Mensagens (WhatsApp, E-mail & Inteligência Artificial)

Sistema completo para automação e gestão de disparos institucionais e em lote via **WhatsApp** (utilizando sessões individuais com Baileys), **E-mail** (via SMTP do Gmail) e **Inteligência Artificial (Google Gemini)** para criação e refinamento de templates de mensagens.

---

## ✨ Funcionalidades Principais

* **Controle de Acesso por Perfil:** Gerenciamento de permissões restritas e flexíveis para os perfis de `Administrador`, `Editor` e `Operador`, blindando rotas e painéis administrativos.
* **Sessão Individual de WhatsApp (Baileys):** Cada usuário possui seu próprio fluxo de conexão via QR Code integrado na tela de perfil, com polling automático de status em tempo real.
* **Criação e Auxílio de Templates:** Módulo completo para criar, editar, ativar/desativar e gerenciar templates de mensagens institucionais, contando com um **Gerador Inteligente por IA (Google Gemini)** que cria opções estruturadas de copywriting e marketing a partir de diretrizes e refinamentos textuais.
* **Disparos Inteligentes em Lote (Streaming SSE):** Importação de planilhas (CSV ou XLSX) para envio automatizado sequencial (E-mail ➔ WhatsApp Principal ➔ WhatsApp Secundário) com intervalos randômicos para evitar bloqueios e feedback visual de logs em tempo real.
* **Histórico de Envios (E-mails & WhatsApps):** Listagens completas e detalhadas de todas as mensagens e e-mails disparados pelo sistema, equipadas com ordenação por data/nome, filtros por autor/remetente (exclusivo para administradores) e modais interativos para visualização completa do conteúdo enviado.

---

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js, Express, MySQL2, Bcrypt, Nodemailer, @whiskeysockets/baileys, @google/genai, dotenv, cors.
* **Frontend:** React, React Router DOM, Axios, QRCode.react, XLSX (SheetJS).

---

## 📦 Comandos para Instalar as Bibliotecas e Rodar o Projeto

Para instalar todas as dependências necessárias no projeto, siga os comandos abaixo divididos entre o Backend e o Frontend:

### 1. Instalação e Execução do Backend
Abra o seu terminal na pasta raiz do **backend** e execute o comando de instalação das bibliotecas:
```bash
npm install
(Este comando instalará pacotes como express, mysql2, bcrypt, nodemailer, @whiskeysockets/baileys, @google/genai, entre outros listados no package.json).Para rodar o servidor backend em desenvolvimento:Bashnode server.js
(O servidor rodará por padrão na porta 3010).2. Instalação e Execução do FrontendAbra o seu terminal na pasta raiz do frontend (aplicação React) e execute o comando de instalação:Bashnpm install
(Este comando instalará bibliotecas como axios, react-router-dom, qrcode.react, xlsx, entre outras).Para rodar a aplicação frontend no navegador:Bashnpm start
(O sistema abrirá automaticamente em http://localhost:3000).🗄️ Configuração do Banco de Dados MySQLCrie um banco de dados MySQL chamado wacursos.   Execute o script SQL abaixo para estruturar as tabelas (usuarios, templates, email, whatsapp) e inserir o usuário administrador padrão:   Nome: Teste   Login: admin   Senha: admin@123 (já convertida em hash bcrypt)   E-mail: teste@teste.com   SQLSET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `wacursos` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `wacursos`;

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) DEFAULT NULL,
  `login` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `perfil` enum('admin','operador','editor','') NOT NULL,
  `email` varchar(255) NOT NULL,
  `gmail_user` varchar(255) DEFAULT NULL,
  `gmail_pass` varchar(255) DEFAULT NULL,
  `whatsapp_session` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuarios_login` (`login`),
  UNIQUE KEY `uk_usuarios_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Inserção do usuário padrão administrador
INSERT INTO `usuarios` (`id`, `nome`, `login`, `password`, `perfil`, `email`, `gmail_user`, `gmail_pass`, `whatsapp_session`) VALUES
(1, 'Teste', 'admin', '$2b$10$Z48eZMOcUHLDRlPAh/fexeX6BcZaM1Fr6vhvC9dRWRs7lNTzUo2R2', 'admin', 'teste@teste.com', 'teste@teste.com', NULL, NULL);

CREATE TABLE `email` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp(),
  `nome` varchar(120) NOT NULL,
  `email1` varchar(120) NOT NULL,
  `email2` varchar(120) DEFAULT NULL,
  `assunto` varchar(120) NOT NULL,
  `menssagem` varchar(1200) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_email_usuarios` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assunto` varchar(180) NOT NULL,
  `mensagem` varchar(1200) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_templates_usuarios` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `whatsapp` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp(),
  `nome` varchar(180) NOT NULL,
  `tel1` varchar(26) NOT NULL,
  `tel2` varchar(26) DEFAULT NULL,
  `menssagem` varchar(1200) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_whatsapp_usuarios` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `email`
  ADD CONSTRAINT `fk_email_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `templates`
  ADD CONSTRAINT `fk_templates_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `whatsapp`
  ADD CONSTRAINT `fk_whatsapp_usuarios` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
🔑 Como Obter a Token Key da API do Google AI StudioPara utilizar o assistente de criação de templates com Inteligência Artificial:Acesse o site oficial do Google AI Studio.Faça login com a sua conta Google.No painel, clique em "Get API key" (Obter chave de API).Crie ou selecione um projeto e copie a chave gerada.Observação Importante: Este projeto foi estruturado para utilizar a versão gemini-3.5-flash-lite no momento atual de criação.⚙️ Configuração do Arquivo .envCrie um arquivo chamado .env na raiz da pasta do backend contendo as seguintes variáveis:Snippet de código# Configurações do Servidor
PORT=3010

# Configurações do Banco de Dados MySQL
DB_HOST=127.0.0.1
DB_USER=admin
DB_PASSWORD=admin@123
DB_NAME=wacursos
DB_PORT=3306

# Configurações do E-mail (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=seuemail@gmail.com
MAIL_PASS=sua-senha-de-app-do-google

# Chave da API do Google Gemini (IA)
GEMINI_API_KEY=sua_chave_da_api_aqui