import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { CONFIG_REDE } from './config';
import './App.css';

function EdicaoTemplate() {
  // Captura o ID do template passado pela URL
  const { id: routeId } = useParams();
  
  // Estados para gerenciar o template atual, lista e usuários
  const [template, setTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [index, setIndex] = useState(0);
  const [searchId, setSearchId] = useState('');

  // Gestão de permissões
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

  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // 1. Carrega a lista de usuários (se for Admin)
  useEffect(() => {
    if (isAdmin) {
      axios.get(`${CONFIG_REDE.URL_BACKEND}/usuarios`)
        .then((res) => setUsuarios(res.data))
        .catch((err) => console.error('Erro ao buscar usuários:', err));
    }
  }, [isAdmin]);

  // 2. CORREÇÃO PRINCIPAL: Busca diretamente o template pelo ID da rota se ele existir
  useEffect(() => {
    if (routeId) {
      // Busca cirúrgica do template exato pelo ID da URL (evita cair no ID 1)
      axios.get(`${CONFIG_REDE.URL_BACKEND}/template/${routeId}`)
        .then((res) => {
          if (res.data) {
            setTemplate(res.data);
          }
        })
        .catch((err) => {
          console.error('Erro ao buscar template específico:', err);
          alert('Template não encontrado ou sem permissão de visualização.');
        });
    }

    // Carrega a lista geral para manter o suporte aos botões de navegação (setas)
    axios.get(`${CONFIG_REDE.URL_BACKEND}/templates`)
      .then((res) => {
        const lista = res.data || [];
        let listaFiltrada = lista;
        if (!isAdmin) {
          listaFiltrada = lista.filter(t => String(t.usuario_id) === String(usuarioIdLogado));
        }
        setTemplates(listaFiltrada);

        // Se houver ID na rota, ajusta o index correspondente na lista para as setas funcionarem
        if (routeId) {
          const alvoIndex = listaFiltrada.findIndex((t) => String(t.id) === String(routeId));
          if (alvoIndex !== -1) {
            setIndex(alvoIndex);
          }
        } else if (listaFiltrada.length > 0) {
          // Se não tem ID na rota, seleciona o primeiro por padrão
          setTemplate(listaFiltrada[0]);
          setIndex(0);
        }
      })
      .catch((err) => console.error('Erro ao listar templates:', err));
  }, [routeId, isAdmin, usuarioIdLogado]);

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

      await axios.put(`${CONFIG_REDE.URL_BACKEND}/update/${template.id}`, payload);

      // Atualiza a lista local em memória
      setTemplates(prev => prev.map((t) => (t.id === template.id ? { ...t, ...payload } : t)));

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
      const res = await axios.get(`${CONFIG_REDE.URL_BACKEND}/template/${searchId.trim()}`);
      if (res.data) {
        const item = res.data;
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