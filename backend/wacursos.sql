-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 21/06/2025 às 03:33
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `wacursos`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `email`
--

CREATE TABLE `email` (
  `id` int(11) NOT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nome` varchar(120) NOT NULL,
  `email1` varchar(120) NOT NULL,
  `email2` varchar(120) DEFAULT NULL,
  `assunto` varchar(120) NOT NULL,
  `menssagem` varchar(1200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `templates`
--

CREATE TABLE `templates` (
  `id` int(11) NOT NULL,
  `ativo` tinyint(1) DEFAULT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assunto` varchar(180) NOT NULL,
  `mensagem` varchar(1200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `templates`
--

INSERT INTO `templates` (`id`, `ativo`, `data`, `assunto`, `mensagem`) VALUES
(1, 1, '2025-06-21 00:20:55', 'Seja bem vindo ao CCNA I - Netacad Cisco Academia Etec de Embu', 'Parabéns! Você está oficialmente inscrito no curso Cisco CCNA I, oferecido por meio da plataforma Cisco Networking Academy (NetAcad) em parceria com a Etec de Embu.\nPara facilitar a comunicação durante o curso, criamos um grupo exclusivo no WhatsApp. Pedimos que você acesse o link e entre no grupo: https://chat.whatsapp.com/H6SbGyvvCLG03ECTcyRkjQ\nNeste grupo, serão compartilhados avisos importantes, materiais complementares, e será um espaço para tirar dúvidas e trocar experiências com os demais colegas do curso.\nSua participação é muito importante para enriquecer nosso aprendizado coletivo! \nNos vemos por lá 🚀 \nEquipe CCNA – Etec de Embu \n'),
(2, 1, '2025-06-21 00:21:46', 'Seja bem vindo ao Fundamentos de IA com IBM SkillsBuild e Cisco – 2025  Netacad Cisco Academia Etec de Embu', '🎉 Parabéns! Você está oficialmente inscrito no curso Fundamentos de IA com IBM SkillsBuild e Cisco – 2025 \nPromovido por meio da plataforma Cisco Networking Academy (NetAcad) e IBM SkillsBuild, em parceria com a ETEC de Embu das Artes.\nPara facilitar a comunicação durante o curso, criamos um grupo exclusivo no WhatsApp. \n👉 Acesse o link e entre no grupo: \nhttps://chat.whatsapp.com/FqpGmoupo2fFi4va2F4Tgr \n📌 Nesse grupo, você terá acesso a: \nAvisos importantes \nMateriais complementares \nSuporte para dúvidas \nTroca de experiências com os demais participantes \nSua participação ativa será essencial para fortalecermos nossa jornada de aprendizado colaborativo! 🤝 \n'),
(3, 1, '2025-06-21 00:22:20', 'Confirmação de inscrição: Curso Fundamentos de Python – ETEC & Cisco NetAcad', '🎉 Parabéns! Você está oficialmente inscrito no curso *Fundamentos de Python com a Cisco Networking Academy – 2025* \nPromovido por meio da plataforma *Cisco Networking Academy (NetAcad), em parceria com a ETEC de Embu das Artes*. \nPara facilitar a comunicação durante o curso, criamos um grupo exclusivo no WhatsApp. \n👉 Acesse o link e entre no grupo: https://chat.whatsapp.com/DGN2Hq3h9qtGBc6n8WPPVt \n📌 Nesse grupo, você terá acesso a: \n- Avisos importantes \n- Materiais complementares \n- Suporte para dúvidas \n- Troca de experiências com os demais participantes \nSua participação ativa será essencial para fortalecermos nossa jornada de aprendizado colaborativo! 🤝 \n');

-- --------------------------------------------------------

--
-- Estrutura para tabela `whatsapp`
--

CREATE TABLE `whatsapp` (
  `id` int(11) NOT NULL,
  `data` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nome` varchar(180) NOT NULL,
  `tel1` int(11) NOT NULL,
  `tel2` int(11) DEFAULT NULL,
  `menssagem` varchar(1200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `email`
--
ALTER TABLE `email`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `whatsapp`
--
ALTER TABLE `whatsapp`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `email`
--
ALTER TABLE `email`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `whatsapp`
--
ALTER TABLE `whatsapp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
