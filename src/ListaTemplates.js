import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './App.css';

function ListaTemplates() {
  // Estados para gerenciar a lista de templates, usuários cadastrados e o filtro de autor
  const [templates, setTemplates] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');

  // Leitura robusta do perfil logado em ambos os storages do navegador (localStorage e sessionStorage)
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    'operador'
  ).toLowerCase().trim();

  // Leitura robusta do ID do usuário logado em ambos os storages do navegador
  const usuarioLogadoId = (
    localStorage.getItem('usuario_id') || 
    sessionStorage.getItem('usuario_id') || 
    localStorage.getItem('user_id') || 
    ''
  ).trim();

  // Validação booleana para verificar se o usuário possui privilégios de administrador
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // Estado para persistir a preferência de exibição de templates ativos (salvo no localStorage)
  const [mostrarSomenteAtivos, setMostrarSomenteAtivos] = useState(() => {
    const salvo = localStorage.getItem('mostrarSomenteAtivos');
    return salvo !== null ? JSON.parse(salvo) : false;
  });

  // Hook de navegação do React Router DOM
  const navigate = useNavigate();

  // Sincroniza a preferência do botão toggle "Mostrar somente ativos" com o localStorage
  useEffect(() => {
    localStorage.setItem('mostrarSomenteAtivos', JSON.stringify(mostrarSomenteAtivos));
  }, [mostrarSomenteAtivos]);

  // 1. Carrega a lista completa de usuários para alimentar o filtro (Executado apenas se for administrador)
  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3010/usuarios')
        .then(res => setUsuarios(res.data))
        .catch(err => console.error('Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // 2. Função responsável por carregar os templates do servidor aplicando restrições de perfil
  const carregarTemplates = (idUsuario = '') => {
    let url = 'http://localhost:3010/templates?';

    if (isAdmin) {
      // Se for admin, pode filtrar por um autor específico se selecionado no select
      if (idUsuario) url += `usuario_id=${idUsuario}&`;
    } else {
      // Se for operador comum, envia as credenciais para o backend restringir apenas aos seus próprios templates
      url += `perfil_logado=${perfilLogado}&usuario_logado_id=${usuarioLogadoId}&`;
    }

    axios.get(url)
      .then(res => setTemplates(res.data))
      .catch(err => console.error('Erro ao buscar templates:', err));
  };

  // Efeito disparado sempre que o administrador altera o filtro de autor selecionado
  useEffect(() => {
    carregarTemplates(usuarioSelecionado);
  }, [usuarioSelecionado]);

  // Função para redirecionar o usuário para a tela de edição do template selecionado
  const handleEdit = (id) => {
    navigate(`/editar-template/${id}`);
  };

  // Filtra dinamicamente a listagem de templates caso o switch "Mostrar somente ativos" esteja ligado
  const templatesFiltrados = mostrarSomenteAtivos
    ? templates.filter(template => template.ativo)
    : templates;

  return (
    <div className="lista-container">
      <h2 className="titulo">Lista de Templates</h2>

      {/* Caixa de seleção de filtro por Autor - Exibida EXCLUSIVAMENTE para administradores */}
      {isAdmin && (
        <div className="linha-template" style={{ marginBottom: '15px' }}>
          <label htmlFor="filtroUsuario" style={{ marginRight: '10px', color: 'white' }}>Filtrar por Autor:</label>
          <select
            id="filtroUsuario"
            value={usuarioSelecionado}
            onChange={(e) => setUsuarioSelecionado(e.target.value)}
            className="select-template"
            style={{ padding: '6px', borderRadius: '4px' }}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome || u.login} ({u.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Botão Toggle para alternar entre exibir todos os templates ou apenas os ativos */}
      <div className="label-toggle">
        <label>Mostrar somente ativos</label>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={mostrarSomenteAtivos}
            onChange={() => setMostrarSomenteAtivos(prev => !prev)}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Tabela estruturada para exibição dos templates */}
      <table className="tabela-templates" style={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '8%' }} />                                     {/* ID */}
          {isAdmin && <col style={{ width: '22.5%' }} />}                      {/* Autor */}
          <col style={{ width: '7.2%' }} />                                    {/* Status */}
          <col style={{ width: isAdmin ? '62.3%' : '84.8%' }} />               {/* Assunto */}
          <col style={{ width: '8%' }} />                                      {/* Ações */}
        </colgroup>
        <thead>
          <tr>
            <th>ID</th>
            {isAdmin && <th>Autor</th>}
            <th>Status</th>
            <th>Assunto</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {templatesFiltrados.map((template) => (
            <tr key={template.id}>
              <td>{template.id}</td>
              {isAdmin && <td>{template.autor_nome || template.autor_login || 'Geral/Desconhecido'}</td>}
              <td>{template.ativo ? 'Ativo' : 'Inativo'}</td>
              <td style={{ wordBreak: 'break-word' }}>{template.assunto}</td>
              <td>
                <button onClick={() => handleEdit(template.id)} style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListaTemplates;