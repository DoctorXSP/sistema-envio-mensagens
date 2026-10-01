import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function ListarEmail() {
  // Estados para gerenciar a lista de e-mails, o modal de detalhes e a ordenação da tabela
  const [dataemail, setDataemail] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  // Estados para gerenciar os usuários cadastrados e o filtro aplicado pelo administrador
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

  // 1. Carrega a lista completa de usuários para alimentar o filtro do painel (Executado apenas se for administrador)
  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3010/usuarios')
        .then(res => setUsuarios(res.data))
        .catch(err => console.error('Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // 2. Função responsável por carregar os e-mails do backend, aplicando restrições de acordo com o perfil
  const carregarEmails = (idUsuario = '') => {
    let url = 'http://localhost:3010/listarEmail?';

    if (isAdmin) {
      // Se for admin, pode filtrar por um usuário específico se selecionado no select
      if (idUsuario) url += `usuario_id=${idUsuario}&`;
    } else {
      // Se for operador comum, envia as credenciais para o backend restringir apenas aos seus próprios envios
      url += `perfil_logado=${perfilLogado}&usuario_logado_id=${usuarioLogadoId}&`;
    }

    axios.get(url)
      .then(res => setDataemail(res.data))
      .catch(err => console.error('Erro ao buscar Lista de e-Mails Enviados:', err));
  };

  // Efeito disparado sempre que o administrador altera o filtro de usuário selecionado
  useEffect(() => {
    carregarEmails(usuarioSelecionado);
  }, [usuarioSelecionado]);

  // Função para abrir o modal de visualização detalhada do e-mail clicado
  const abrirModal = (item) => {
    setItemSelecionado(item);
    setModalAberto(true);
  };

  // Função para fechar o modal de detalhes
  const fecharModal = () => {
    setModalAberto(false);
    setItemSelecionado(null);
  };

  // Função para ordenar os registros da tabela com base no campo selecionado (Data ou Nome)
  const ordenar = (campo) => {
    const novaOrdem = sortField === campo && sortOrder === 'asc' ? 'desc' : 'asc';
    const dadosOrdenados = [...dataemail].sort((a, b) => {
      if (campo === 'data') {
        return novaOrdem === 'asc'
          ? new Date(a.data) - new Date(b.data)
          : new Date(b.data) - new Date(a.data);
      } else {
        const valA = a[campo] || '';
        const valB = b[campo] || '';
        return novaOrdem === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
    });
    setSortField(campo);
    setSortOrder(novaOrdem);
    setDataemail(dadosOrdenados);
  };

  // Função para limpar todos os filtros e ordenações aplicadas na listagem
  const limparFiltros = () => {
    setUsuarioSelecionado('');
    setSortField(null);
    setSortOrder('asc');
    carregarEmails('');
  };

  return (
    <div className="lista-container-email">
      <h2 className="titulo">Lista de e-Mails Enviados</h2>

      {/* Caixa de seleção de filtro por Usuário Remetente - Exibida EXCLUSIVAMENTE para administradores */}
      {isAdmin && (
        <div className="linha-template" style={{ marginBottom: '15px' }}>
          <label htmlFor="filtroUsuario" style={{ marginRight: '10px', color: 'white' }}>Filtrar por Usuário:</label>
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

      {/* Botões de controle de ordenação e limpeza de filtros */}
      <div className="filtros">
        <button onClick={() => ordenar('data')}>
          Ordenar por Data ({sortField === 'data' ? sortOrder.toUpperCase() : 'ASC'})
        </button>
        <button onClick={() => ordenar('nome')}>
          Ordenar por Nome ({sortField === 'nome' ? sortOrder.toUpperCase() : 'ASC'})
        </button>
        <button onClick={limparFiltros}>Limpar Filtros</button>
      </div>

      {/* Tabela de listagem dos e-mails disparados */}
      <table className="tabela-email">
        <thead>
          <tr>
            <th>Data</th>
            {isAdmin && <th>Remetente</th>}
            <th>Nome</th>
            <th>e-Mail Principal</th>
            <th>Email CC</th>
            <th>Assunto</th>
            <th>Mensagem</th>
          </tr>
        </thead>
        <tbody>
          {dataemail.map((data) => (
            <tr key={data.id} onClick={() => abrirModal(data)} style={{ cursor: 'pointer' }}>
              <td>{data.data ? new Date(data.data).toLocaleDateString('pt-BR') : ''}</td>
              {isAdmin && <td>{data.autor_nome || data.autor_login || 'Geral/Desconhecido'}</td>}
              <td>{data.nome}</td>
              <td>{data.email1}</td>
              <td>{data.email2}</td>
              <td>{data.assunto}</td>
              <td>{data.menssagem}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal flutuante para exibição completa dos detalhes da mensagem selecionada */}
      {modalAberto && itemSelecionado && (
        <div className="modal-overlay">
          <div className="modal-conteudo">
            <button className="fechar-modal" onClick={fecharModal}>X</button>
            <h3>Detalhes da Mensagem</h3>
            <p><strong>Data:</strong> {new Date(itemSelecionado.data).toLocaleDateString('pt-BR')}</p>
            {isAdmin && (
              <p><strong>Remetente (Usuário):</strong> {itemSelecionado.autor_nome || itemSelecionado.autor_login || 'Geral/Desconhecido'}</p>
            )}
            <p><strong>Nome:</strong> {itemSelecionado.nome}</p>
            <p><strong>e-Mail Principal:</strong> {itemSelecionado.email1}</p>
            {itemSelecionado.email2 && <p><strong>e-Mail Cc:</strong> {itemSelecionado.email2}</p>}
            <p><strong>Assunto:</strong> {itemSelecionado.assunto}</p>
            <div className="mensagem-detalhada">
              <strong>Mensagem:</strong>
              <p>{itemSelecionado.menssagem}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListarEmail;