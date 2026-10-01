import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function ListarWhatsapp() {
  // Estados para gerenciar a lista de mensagens do WhatsApp, controle do modal de detalhes e ordenação
  const [whatsapp, setWhatsapp] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  // Estados para gerenciar a lista de usuários e o filtro de remetente do administrador
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
    '3'
  ).trim();

  // Validação booleana para verificar se o usuário possui privilégios de administrador
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // 1. Carrega a lista completa de usuários para alimentar o filtro (Executado apenas se for administrador)
  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3010/usuarios')
        .then(res => setUsuarios(res.data))
        .catch(err => console.error('Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // 2. Função responsável por carregar os dados do WhatsApp aplicando restrições de perfil no backend
  const carregarDados = (idUsuario = '') => {
    let url = 'http://localhost:3010/listarWhatsapp?';
    
    if (isAdmin) {
      // Se for admin, pode filtrar por um usuário específico se selecionado no select
      if (idUsuario) url += `usuario_id=${idUsuario}&`;
    } else {
      // Se for operador comum, envia as credenciais para o backend restringir apenas aos seus próprios envios
      url += `perfil_logado=${perfilLogado}&usuario_logado_id=${usuarioLogadoId}&`;
    }

    axios.get(url)
      .then(res => setWhatsapp(res.data))
      .catch(err => console.error('Erro ao buscar Lista de Whatsapps Enviados:', err));
  };

  // Efeito disparado sempre que o administrador altera o filtro de usuário selecionado
  useEffect(() => {
    carregarDados(usuarioSelecionado);
  }, [usuarioSelecionado]);

  // Função para abrir o modal de visualização detalhada da mensagem clicada
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
    const dadosOrdenados = [...whatsapp].sort((a, b) => {
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
    setWhatsapp(dadosOrdenados);
  };

  // Função para limpar todos os filtros e ordenações aplicadas na listagem
  const limparFiltros = () => {
    setUsuarioSelecionado('');
    setSortField(null);
    setSortOrder('asc');
    carregarDados('');
  };

  return (
    <div className="lista-container-whatsapp">
      <h2 className="titulo">Lista de WhatsApp Enviados</h2>

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

      {/* Tabela estruturada para exibição dos disparos de WhatsApp */}
      <table className="tabela-whatsapp" style={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '12%' }} />                                   {/* Data */}
          {isAdmin && <col style={{ width: '13.5%' }} />}                      {/* Remetente */}
          <col style={{ width: isAdmin ? '21.5%' : '35%' }} />                 {/* Nome */}
          <col style={{ width: '12%' }} />                                   {/* Telefone 1 */}
          <col style={{ width: '12%' }} />                                   {/* Telefone 2 */}
          <col style={{ width: '29%' }} />                                   {/* Mensagem */}
        </colgroup>
        <thead>
          <tr>
            <th>Data</th>
            {isAdmin && <th>Remetente</th>}
            <th>Nome</th>
            <th>Telefone 1</th>
            <th>Telefone 2</th>
            <th>Mensagem</th>
          </tr>
        </thead>
        <tbody>
          {whatsapp.map((data) => (
            <tr key={data.id} onClick={() => abrirModal(data)} style={{ cursor: 'pointer' }}>
              <td>{data.data ? new Date(data.data).toLocaleDateString('pt-BR') : ''}</td>
              {isAdmin && <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.autor_nome || data.autor_login || 'Geral/Desconhecido'}</td>}
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.nome}</td>
              <td>{data.tel1}</td>
              <td>{data.tel2 === 0 || data.tel2 === '0' ? '' : data.tel2}</td>
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.menssagem}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal flutuante para exibição completa dos detalhes da mensagem de WhatsApp selecionada */}
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
            <p><strong>Telefone 1:</strong> {itemSelecionado.tel1}</p>
            {itemSelecionado.tel2 && itemSelecionado.tel2 !== '0' && (
              <p><strong>Telefone 2:</strong> {itemSelecionado.tel2}</p>
            )}
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

export default ListarWhatsapp;