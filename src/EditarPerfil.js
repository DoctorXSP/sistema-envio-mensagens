import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';

export default function EditarPerfil() {
  // Estados para gerenciar os dados dos usuários e o usuário alvo selecionado
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioIdAlvo, setUsuarioIdAlvo] = useState('');
  
  // Estados para os campos do formulário de perfil e credenciais
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPass, setGmailPass] = useState('');
  const [perfil, setPerfil] = useState('operador');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  
  // Estados para gerenciar a conexão do WhatsApp via Baileys e o QR Code
  const [qrCodeData, setQrCodeData] = useState('');
  const [statusWp, setStatusWp] = useState('desconectado');
  const [carregandoQr, setCarregandoQr] = useState(false);

  // Leitura robusta do perfil logado: verifica tanto localStorage quanto sessionStorage 
  // (evita falhas caso o usuário não marque a caixa "Permanecer conectado")
  const perfilLogado = (
    localStorage.getItem('perfil') || 
    sessionStorage.getItem('perfil') || 
    localStorage.getItem('user_perfil') || 
    localStorage.getItem('role') || 
    'operador'
  ).toLowerCase().trim();

  // Leitura robusta do ID do usuário logado em ambos os storages do navegador
  const usuarioLogadoId = (
    localStorage.getItem('usuario_id') || 
    sessionStorage.getItem('usuario_id') || 
    localStorage.getItem('user_id') || 
    localStorage.getItem('id') || 
    ''
  ).trim();

  // Validação booleana para verificar se o usuário logado possui perfil de administrador
  const isAdmin = perfilLogado === 'admin' || perfilLogado === 'administrador';

  // Log de auditoria no console para fins de depuração
  console.log('🔍 [AUDIT PERFIL] Perfil lido:', perfilLogado, '| ID Logado:', usuarioLogadoId, '| É Admin?', isAdmin);

  // 1. Carrega a lista completa de usuários cadastrados no banco de dados ao iniciar o componente
  useEffect(() => {
    axios.get('http://localhost:3010/usuarios')
      .then(res => {
        console.log('👥 [DEBUG] Usuários vindos do banco:', res.data);
        setUsuarios(res.data);
        
        // Se for administrador, seleciona o primeiro usuário da lista por padrão
        if (isAdmin && res.data.length > 0) {
          setUsuarioIdAlvo(res.data[0].id);
        } else {
          // Se for operador comum, define obrigatoriamente o seu próprio ID como alvo
          setUsuarioIdAlvo(usuarioLogadoId);
        }
      })
      .catch(err => console.error('❌ Erro ao buscar usuários:', err));
  }, [isAdmin, usuarioLogadoId]);

  // 2. Preenche os campos do formulário automaticamente sempre que o usuário selecionado muda
  useEffect(() => {
    if (!usuarioIdAlvo || usuarios.length === 0) return;
    const user = usuarios.find(u => String(u.id) === String(usuarioIdAlvo));
    if (user) {
      setNome(user.nome || '');
      setLogin(user.login || '');
      setEmail(user.email || '');
      setGmailUser(user.gmail_user || user.email || '');
      setPerfil(user.perfil || 'operador');
      setPassword(''); 
      setConfirmPassword('');
      setGmailPass('');
      verificarStatusWhatsApp(usuarioIdAlvo);
    }
  }, [usuarioIdAlvo, usuarios]);

  // 3. Polling automático (setInterval): verifica o status do WhatsApp a cada 3 segundos 
  // para atualizar a interface instantaneamente assim que o QR Code for escaneado
  useEffect(() => {
    if (!usuarioIdAlvo) return;

    const intervalo = setInterval(() => {
      // Só executa a requisição se o WhatsApp ainda não estiver conectado, otimizando o sistema
      if (statusWp !== 'conectado') {
        verificarStatusWhatsApp(usuarioIdAlvo);
      }
    }, 3000); 

    // Limpa o intervalo quando o componente é desmontado ou o ID muda
    return () => clearInterval(intervalo);
  }, [usuarioIdAlvo, statusWp]);

  // 4. Função auxiliar para consultar o status atual do Baileys e atualizar o QR Code se necessário
  const verificarStatusWhatsApp = async (id) => {
    try {
      const res = await axios.get(`http://localhost:3010/whatsapp/status/${id}`);
      setStatusWp(res.data.status);
      if (res.data.status === 'conectado') {
        setQrCodeData(''); // Limpa o QR Code da tela automaticamente assim que a conexão é estabelecida
      } else if (res.data.qr) {
        setQrCodeData(res.data.qr);
      }
    } catch (e) {
      console.error('❌ Erro ao verificar status do WhatsApp:', e);
    }
  };

  // Função acionada ao clicar no botão para gerar o QR Code de conexão do WhatsApp
  const conectarWhatsApp = async () => {
    const idParaConectar = usuarioIdAlvo || usuarioLogadoId;

    if (!idParaConectar) {
      setMensagem({ texto: 'Erro: ID do usuário não identificado. Faça login novamente.', tipo: 'erro' });
      return;
    }

    setCarregandoQr(true);
    setMensagem({ texto: 'Gerando QR Code do WhatsApp...', tipo: 'sucesso' });
    try {
      const res = await axios.get(`http://localhost:3010/whatsapp/conectar/${idParaConectar}`);
      if (res.data.qr) {
        setQrCodeData(res.data.qr);
        setStatusWp('aguardando_scan');
        setMensagem({ texto: 'QR Code gerado com sucesso! Escaneie com seu celular.', tipo: 'sucesso' });
      } else if (res.data.status === 'conectado') {
        setStatusWp('conectado');
        setQrCodeData('');
        setMensagem({ texto: 'WhatsApp já está conectado!', tipo: 'sucesso' });
      }
    } catch (e) {
      console.error('❌ Erro ao conectar WhatsApp:', e);
      setMensagem({ texto: 'Erro ao gerar QR Code do WhatsApp.', tipo: 'erro' });
    }
    setCarregandoQr(false);
  };

  // Função para salvar as alterações do perfil, e-mail e senhas no banco de dados
  const handleUpdate = async (e) => {
    e.preventDefault();
    setMensagem({ texto: '', tipo: '' });

    if (!nome) {
      setMensagem({ texto: 'O campo Nome é obrigatório.', tipo: 'erro' });
      return;
    }

    if (password && password !== confirmPassword) {
      setMensagem({ texto: 'As senhas não coincidem. Tente novamente.', tipo: 'erro' });
      return;
    }

    // Monta o payload com os dados de perfil, Gmail e senha de app
    const payload = {
      nome,
      email,
      gmail_user: gmailUser,
      ...(gmailPass && { gmail_pass: gmailPass }),
      ...(isAdmin && { login, perfil }),
      ...(password && { password })
    };

    try {
      await axios.put(`http://localhost:3010/usuarios/${usuarioIdAlvo}`, payload);
      setMensagem({ texto: 'Perfil e credenciais atualizados com sucesso!', tipo: 'sucesso' });
      setPassword('');
      setConfirmPassword('');
      setGmailPass('');

      // Recarrega a lista de usuários do banco para manter a interface sincronizada
      const res = await axios.get('http://localhost:3010/usuarios');
      setUsuarios(res.data);

      // Atualiza o nome armazenado no storage correto caso o usuário esteja editando a si mesmo
      if (String(usuarioIdAlvo) === String(usuarioLogadoId)) {
        if (localStorage.getItem('usuario_id')) localStorage.setItem('nome', nome);
        if (sessionStorage.getItem('usuario_id')) sessionStorage.setItem('nome', nome);
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar perfil:', err);
      setMensagem({ texto: 'Erro ao atualizar perfil.', tipo: 'erro' });
    }
  };

  return (
    <div className="container">
      <h2 className="titulo">{isAdmin ? 'Painel Administrativo - Gerenciamento de Usuários & Integrações' : 'Meu Perfil & Integrações'}</h2>

      {/* Caixa de alerta para exibir mensagens de feedback */}
      {mensagem.texto && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          borderRadius: '4px',
          backgroundColor: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
          color: mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
          border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {mensagem.texto}
        </div>
      )}

      {/* SE FOR ADMIN: Exibe o seletor para gerenciar outros usuários do sistema */}
      {isAdmin && (
        <div className="linha-template" style={{ marginBottom: '20px', background: '#1e293b', padding: '15px', borderRadius: '6px', border: '1px solid #3b82f6' }}>
          <label htmlFor="usuarioAlvoSelect" style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#6ee7b7' }}>
            🛠️ [ADMIN] Selecione o usuário que deseja gerenciar:
          </label>
          <select
            id="usuarioAlvoSelect"
            value={usuarioIdAlvo}
            onChange={(e) => setUsuarioIdAlvo(e.target.value)}
            className="select-template"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '4px', background: '#0f172a', color: 'white' }}
          >
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome || u.login} ({u.email}) — [Perfil: {u.perfil}]
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleUpdate}>
        
        {/* NOME: Campo liberado para edição por todos os usuários */}
        <label>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />

        {/* LOGIN DE ACESSO: Editável apenas se for Admin, travado para operadores */}
        <label>Login de Acesso {!isAdmin && '(Não editável)'}</label>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          disabled={!isAdmin}
          style={!isAdmin ? { backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'not-allowed' } : {}}
          required
        />

        {/* E-MAIL: Editável apenas se for Admin, travado para operadores */}
        <label>E-mail {!isAdmin && '(Não editável)'}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!isAdmin}
          style={!isAdmin ? { backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'not-allowed' } : {}}
          required
        />

        {/* PERFIL (Tipo de usuário): Visível e editável exclusivamente por administradores */}
        {isAdmin && (
          <div className="linha-template" style={{ marginTop: '10px', marginBottom: '15px' }}>
            <label htmlFor="perfilSelect">Tipo de Usuário (Perfil)</label>
            <select
              id="perfilSelect"
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className="select-template"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px' }}
            >
              <option value="operador">Operador</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        )}

        <hr style={{ margin: '25px 0', borderColor: '#334155' }} />
        
        {/* SEÇÃO DE CONFIGURAÇÃO DE E-MAIL (GMAIL) */}
        <h3 style={{ color: '#38bdf8', fontSize: '1.1rem', marginBottom: '15px' }}>📧 Configuração de E-mail para Disparos</h3>
        
        <label>E-mail do Gmail Remetente</label>
        <input
          type="email"
          value={gmailUser}
          onChange={(e) => setGmailUser(e.target.value)}
          placeholder="seuemail@gmail.com"
        />

        <label>Senha de App do Gmail (16 dígitos)</label>
        <input
          type="password"
          value={gmailPass}
          onChange={(e) => setGmailPass(e.target.value)}
          placeholder="Deixe em branco para manter a senha atual"
        />

        {/* PASSO A PASSO EXPLICATIVO PARA O GMAIL */}
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: '#0f172a', padding: '12px', borderRadius: '6px', marginTop: '8px', border: '1px solid #334155', lineHeight: '1.5' }}>
          💡 <strong>Passo a passo para obter sua Senha de App do Gmail:</strong><br/>
          1. Acesse sua Conta Google (<code>myaccount.google.com</code>) e certifique-se de que a <strong>Verificação em Duas Etapas</strong> está ativada.<br/>
          2. Na barra de pesquisa da Conta Google, digite <strong>Senhas de app</strong> (ou vá em Segurança > Acesso ao Google > Senhas de app).<br/>
          3. Digite um nome para identificação (ex: <em>Sistema de Disparos</em>) e clique em <strong>Gerar</strong>.<br/>
          4. Copie a senha de 16 caracteres gerada e cole no campo <em>Senha de App do Gmail</em> acima.
        </div>

        <hr style={{ margin: '25px 0', borderColor: '#334155' }} />

        {/* SEÇÃO DE CONEXÃO DO WHATSAPP (BAILEYS) */}
        <div style={{ marginTop: '15px', background: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#22c55e', margin: '0 0 10px 0', fontSize: '1.1rem' }}>📱 Conexão WhatsApp (Baileys Individual)</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>
            Status da conexão: <strong style={{ color: statusWp === 'conectado' ? '#22c55e' : '#facc15' }}>{statusWp}</strong>
          </p>
          
          {statusWp !== 'conectado' ? (
            <div>
              <button 
                type="button" 
                onClick={conectarWhatsApp} 
                disabled={carregandoQr} 
                style={{ background: '#22c55e', color: '#0f172a', fontWeight: 'bold', padding: '10px 18px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {carregandoQr ? 'Gerando QR Code...' : 'Gerar QR Code do WhatsApp'}
              </button>
              
              {qrCodeData && (
                <div style={{ marginTop: '20px', background: 'white', padding: '20px', display: 'inline-block', borderRadius: '8px', textAlign: 'center' }}>
                  <QRCodeSVG value={qrCodeData} size={220} />
                  <p style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '10px' }}>
                    Abra o WhatsApp no seu celular e escaneie o QR Code
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#052e16', padding: '12px', borderRadius: '6px', border: '1px solid #166534' }}>
              <p style={{ color: '#4ade80', fontWeight: 'bold', margin: 0 }}>
                ✅ WhatsApp conectado com sucesso para este usuário! Pronto para disparos em lote.
              </p>
            </div>
          )}
        </div>

        <hr style={{ margin: '25px 0', borderColor: '#334155' }} />

        {/* Campos de alteração de senha de acesso ao sistema */}
        <label>Nova Senha do Sistema (deixe em branco para não alterar)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Digite apenas se desejar mudar a senha"
        />

        <label>Confirme a Nova Senha do Sistema</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Digite a senha novamente para confirmar"
        />

        {/* Botão de envio principal do formulário */}
        <div className="botoes" style={{ marginTop: '25px' }}>
          <button type="submit" style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold' }}>Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}