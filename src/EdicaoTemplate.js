import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './App.css';

function EdicaoTemplate() {
  // Captura o ID do template passado pela URL (caso exista na rota)
  const { id: routeId } = useParams();
  
  // Estados para gerenciar o template atual, lista filtrada e lista completa
  const [template, setTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [todosTemplates, setTodosTemplates] = useState([]); // Guarda todos os templates carregados da API
  const [usuarios, setUsuarios] = useState([]);
  const [index, setIndex] = useState(0);
  const [searchId, setSearchId] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState(''); // Estado para o select do Admin filtrar os outros usuários

  // Gestão robusta de permissões e ID do usuário logado (lendo de forma flexível de ambos os Storages)
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    'operador'
  ).toLowerCase().trim();

  const usuarioIdLogado = (
    localStorage.getItem('usuario_id') || 
    sessionStorage.getItem('usuario_id') || 
    localStorage.getItem('user_id') || 
    ''
  ).trim();

  // Verifica se o usuário atual possui privilégios administrativos
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // 1. Carrega a lista de usuários cadastrados (Executado apenas se for Administrador)
  useEffect(() => {
    if (isAdmin) {
      axios.get('http://localhost:3010/usuarios')
        .then((res) => setUsuarios(res.data))
        .catch((err) => console.error('Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // 2. Carrega todos os templates do servidor e define a regra inicial de exibição baseada no perfil
  useEffect(() => {
    axios.get('http://localhost:3010/templates')
      .then((res) => {
        const lista = res.data || [];
        setTodosTemplates(lista);

        // Aplica o filtro inicial de exibição dependendo se é Admin ou Operador comum
        let listaFiltrada = lista;
        if (!isAdmin) {
          // Operador comum vê estritamente apenas os templates criados por ele mesmo
          listaFiltrada = lista.filter(t => String(t.usuario_id) === String(usuarioIdLogado));
        }

        setTemplates(listaFiltrada);

        // Se não houver templates disponíveis, limpa a tela
        if (listaFiltrada.length === 0) {
          setTemplate(null);
          return;
        }

        // Se houver um ID na rota, tenta selecioná-lo diretamente
        if (routeId) {
          const alvoIndex = listaFiltrada.findIndex((t) => String(t.id) === String(routeId));
          if (alvoIndex !== -1) {
            setIndex(alvoIndex);
            setTemplate(listaFiltrada[alvoIndex]);
          } else {
            // Realiza uma busca individual caso o template não esteja na lista filtrada atual
            axios.get(`http://localhost:3010/template/${routeId}`)
              .then((itemRes) => {
                setTemplate(itemRes.data);
              })
              .catch(() => alert('Template não encontrado ou sem permissão de visualização.'));
          }
        } else {
          // Caso padrão: seleciona o primeiro item da lista
          setIndex(0);
          setTemplate(listaFiltrada[0]);
        }
      })
      .catch((err) => console.error('Erro ao listar templates:', err));
  }, [routeId, isAdmin, usuarioIdLogado]);

  // 3. Atualiza a lista exibida em tela quando o Administrador altera o filtro de usuários
  useEffect(() => {
    if (!isAdmin) return;

    let filtrados = todosTemplates;
    if (filtroUsuario === 'meus') {
      filtrados = todosTemplates.filter(t => String(t.usuario_id) === String(usuarioIdLogado));
    } else if (filtroUsuario !== '') {
      // Filtra por um ID de usuário específico selecionado no select
      filtrados = todosTemplates.filter(t => String(t.usuario_id) === String(filtroUsuario));
    }
    // Se filtroUsuario estiver vazio (''), o Admin visualiza todos os templates do sistema

    setTemplates(filtrados);
    if (filtrados.length > 0) {
      setIndex(0);
      setTemplate(filtrados[0]);
    } else {
      setTemplate(null);
    }
  }, [filtroUsuario, todosTemplates, isAdmin, usuarioIdLogado]);

  // 4. Função para enviar a atualização do template atual para o backend
  const handleUpdate = async () => {
    if (!template) return;
    try {
      const payload = {
        ativo: template.ativo ? 1 : 0,
        assunto: template.assunto || '',
        mensagem: template.mensagem || '',
        usuario_id: template.usuario_id ? Number(template.usuario_id) : null
      };

      await axios.put(`http://localhost:3010/update/${template.id}`, payload);

      // Atualiza as listas em memória local para manter a consistência visual instantânea
      const atualizarLista = (prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, ...payload } : t));

      setTemplates(atualizarLista);
      setTodosTemplates(atualizarLista);

      alert('Template atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar template:', err);
      alert('Erro ao atualizar template.');
    }
  };

  // 5. Função para buscar um template específico digitando o ID no input
  const handleSearch = async () => {
    if (!searchId.trim()) return;
    try {
      const res = await axios.get(`http://localhost:3010/template/${searchId.trim()}`);
      if (res.data) {
        const item = res.data;
        // Validação de segurança para operadores comuns não acessarem templates de terceiros
        if (!isAdmin && String(item.usuario_id) !== String(usuarioIdLogado)) {
          alert('Você não tem permissão para visualizar este template.');
          return;
        }

        setTemplate(item);
        const idx = templates.findIndex((t) => String(t.id) === String(item.id));
        if (idx !== -1) setIndex(idx);
      }
    } catch (err) {
      alert('Template não encontrado.');
    }
  };

  // 6. Função de navegação entre os templates (botões de seta anterior/próximo)
  const handleNavigation = (direction) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < templates.length) {
      setIndex(newIndex);
      setTemplate(templates[newIndex]);
    }
  };

  // Renderização condicional caso nenhum template seja encontrado
  if (!template && templates.length === 0) {
    return (
      <div className="container">
        <h2 className="titulo">Edição de Template</h2>
        {isAdmin && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Filtrar templates por:</label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
            >
              <option value="">Todos os usuários</option>
              <option value="meus">Meus templates</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  Templates de {u.nome || u.login}
                </option>
              ))}
            </select>
          </div>
        )}
        <p style={{ color: 'white', marginTop: '20px' }}>Nenhum template encontrado.</p>
      </div>
    );
  }

  // Tela de carregamento enquanto o template é buscado
  if (!template) {
    return (
      <div className="container">
        <p style={{ color: 'white' }}>Carregando...</p>
      </div>
    );
  }

  // Renderização principal do formulário de edição de templates
  return (
    <div className="container">
      <h2 className="titulo">Edição de Template</h2>

      {/* Caixa de seleção exclusiva para o Admin filtrar os templates de outros usuários */}
      {isAdmin && (
        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
          <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Filtrar visualização:</label>
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Todos os usuários</option>
            <option value="meus">Apenas meus templates</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                Templates de {u.nome || u.login}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Exibição visual do ID do template atual */}
      <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '15px', textAlign: 'left' }}>
        ID: {template.id}
      </div>

      {/* Campo de alteração de Autor visível APENAS para administradores */}
      {isAdmin && (
        <>
          <label>Autor</label>
          <select
            value={template.usuario_id || ''}
            onChange={(e) =>
              setTemplate({
                ...template,
                usuario_id: e.target.value ? Number(e.target.value) : null
              })
            }
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '15px',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Sem usuário atribuído</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome || u.login}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Botão de alternância (Toggle) para definir se o template está ativo ou inativo */}
      <div className="label-toggle">
        <label>Ativo</label>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={Boolean(template.ativo)}
            onChange={() => setTemplate({ ...template, ativo: !template.ativo })}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Campo de Assunto */}
      <label>Assunto</label>
      <input
        type="text"
        value={template.assunto || ''}
        onChange={(e) => setTemplate({ ...template, assunto: e.target.value })}
      />

      {/* Campo de Mensagem */}
      <label>Mensagem</label>
      <textarea
        rows="8"
        value={template.mensagem || ''}
        onChange={(e) => setTemplate({ ...template, mensagem: e.target.value })}
      />

      {/* Botões de navegação entre os registros e botão de atualizar */}
      <div className="botoes">
        {index > 0 && (
          <button type="button" onClick={() => handleNavigation(-1)}>
            &larr;
          </button>
        )}
        <button type="button" onClick={handleUpdate}>
          Atualizar
        </button>
        {index < templates.length - 1 && (
          <button type="button" onClick={() => handleNavigation(1)}>
            &rarr;
          </button>
        )}
      </div>

      {/* Seção de pesquisa rápida de template por ID */}
      <div style={{ marginTop: '20px' }}>
        <label>Pesquisar por ID</label>
        <input
          type="text"
          value={searchId}
          placeholder="Digite o ID..."
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>
          Buscar
        </button>
      </div>
    </div>
  );
}

export default EdicaoTemplate;