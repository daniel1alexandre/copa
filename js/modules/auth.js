// Módulo de Autenticação e Portal de Login Oficial CBT
import { toast } from './toast.js';

const ADMIN_USERNAME = 'Baumann';
const ADMIN_PASSWORD = 'Daniel0306';
const SESSION_KEY = 'copa_federacoes_auth_session';

class AuthService {
  constructor() {
    this.session = this.loadSession();
    this.authListeners = [];
  }

  loadSession() {
    // Retorna null sempre, forçando o login toda vez que a página for recarregada
    return null;
  }

  saveSession(sessionData, remember = false) {
    this.session = sessionData;
    const json = JSON.stringify(sessionData);
    if (remember) {
      localStorage.setItem(SESSION_KEY, json);
    } else {
      sessionStorage.setItem(SESSION_KEY, json);
    }
    this.notify();
  }

  clearSession() {
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.notify();
  }

  getCurrentUser() {
    return this.session;
  }

  isAdmin() {
    return Boolean(this.session && this.session.role === 'admin');
  }

  isLoggedIn() {
    return Boolean(this.session);
  }

  onAuthChange(fn) {
    this.authListeners.push(fn);
    fn(this.session);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.authListeners.forEach(fn => {
      try {
        fn(this.session);
      } catch (e) {
        console.error('Erro em ouvinte de auth:', e);
      }
    });
  }

  login(username, password, remember = false) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Obtém a lista atualizada de usuários cadastrados no store
    const users = (window.store && typeof window.store.getUsers === 'function')
      ? window.store.getUsers()
      : [{ id: 'u_baumann', username: 'Baumann', name: 'Baumann', password: 'Daniel0306', role: 'admin' }];

    const matched = users.find(u => (u.username || '').toLowerCase() === cleanUser && u.password === cleanPass);

    if (matched) {
      const sessionData = {
        id: matched.id,
        username: matched.username,
        role: matched.role || 'admin',
        displayName: matched.name || matched.username,
        label: matched.role === 'admin' ? 'Administrador CBT' : 'Operador CBT',
        loginTime: new Date().toISOString()
      };
      this.saveSession(sessionData, remember);
      return { success: true, user: sessionData };
    }

    return {
      success: false,
      message: 'Usuário ou senha incorretos! Verifique os dados digitados.'
    };
  }

  loginAsGuest() {
    const sessionData = {
      username: 'Visitante',
      role: 'guest',
      displayName: 'Espectador',
      label: 'Visitante (Tempo Real)',
      loginTime: new Date().toISOString()
    };
    this.saveSession(sessionData, false);
    return { success: true, user: sessionData };
  }

  logout() {
    this.clearSession();
    showLoginPortal();
    toast.show({
      title: 'Sessão Encerrada',
      message: 'Você saiu do sistema.',
      type: 'info'
    });
  }
}

export const auth = new AuthService();
window.auth = auth;

// ============================================================
// INTERFACE DA TELA INICIAL (PORTAL CBT)
// ============================================================
export function initAuthUI() {
  renderAuthPortalElement();

  // Se não estiver logado, exibe a tela inicial
  if (!auth.isLoggedIn()) {
    showLoginPortal();
  } else {
    hideLoginPortal();
    updateTopbarUserBadge();
  }

  // Monitora alterações de sessão
  auth.onAuthChange(() => {
    updateTopbarUserBadge();
  });
}

export function showLoginPortal() {
  const portal = document.getElementById('cbt-login-portal');
  if (portal) {
    portal.classList.add('active');
    document.body.classList.add('portal-open');
    document.documentElement.classList.add('portal-open');
    // Campo de usuário sempre limpo ao acessar o endereço
    const userInput = document.getElementById('portal-username');
    if (userInput) {
      userInput.value = '';
      userInput.focus();
    }
    const passInput = document.getElementById('portal-password');
    if (passInput) {
      passInput.value = '';
    }
  }
}

export function hideLoginPortal() {
  const portal = document.getElementById('cbt-login-portal');
  if (portal) {
    portal.classList.remove('active');
    document.body.classList.remove('portal-open');
    document.documentElement.classList.remove('portal-open');
  }
}

function updateTopbarUserBadge() {
  const badgeContainer = document.getElementById('topbar-user-section');
  if (!badgeContainer) return;

  const current = auth.getCurrentUser();
  if (!current) {
    badgeContainer.innerHTML = `
      <button class="btn-topbar-auth btn-topbar-login" onclick="window.showLoginPortal()">
        <span class="auth-icon">🔐</span>
        <span class="auth-label">Entrar</span>
      </button>
    `;
    return;
  }

  if (current.role === 'admin') {
    badgeContainer.innerHTML = `
      <div class="user-pill admin-pill" onclick="window.openUserManagerModal()" title="Clique para configurar e gerenciar usuários" style="cursor: pointer;">
        <div class="user-pill-avatar">🏆</div>
        <div class="user-pill-info">
          <span class="user-pill-name">${current.displayName}</span>
          <span class="user-pill-role">Admin CBT ⚙️</span>
        </div>
        <button class="user-pill-logout" onclick="event.stopPropagation(); window.auth.logout();" title="Sair da conta">
          ✕
        </button>
      </div>
    `;
  } else {
    badgeContainer.innerHTML = `
      <div class="user-pill guest-pill" onclick="window.showLoginPortal()" title="Acesso em modo leitura. Clique para entrar como Administrador." style="cursor: pointer;">
        <div class="user-pill-avatar">👁️</div>
        <div class="user-pill-info">
          <span class="user-pill-name">Ao Vivo</span>
          <span class="user-pill-role">Espectador</span>
        </div>
        <button class="btn-upgrade-login" onclick="event.stopPropagation(); window.showLoginPortal();" title="Fazer Login como Administrador">
          Admin
        </button>
      </div>
    `;
  }
}

function renderAuthPortalElement() {
  if (document.getElementById('cbt-login-portal')) return;

  const portalDiv = document.createElement('div');
  portalDiv.id = 'cbt-login-portal';
  portalDiv.className = 'cbt-portal-overlay';

  portalDiv.innerHTML = `
    <div class="cbt-portal-backdrop"></div>
    <div class="cbt-portal-card">
      
      <!-- CABEÇALHO COM LOGO OFICIAL CBT -->
      <div class="portal-brand-header">
        <div class="portal-logo-wrapper">
          <img src="assets/logo.jpg" alt="Logo Oficial Confederação Brasileira de Tênis" class="portal-cbt-logo">
          <div class="portal-logo-glow"></div>
        </div>
        <div class="portal-titles">
          <span class="portal-confederacao">CONFEDERAÇÃO BRASILEIRA DE TÊNIS</span>
          <h2 class="portal-main-title">Copa das Federações 2026</h2>
          <span class="portal-sub-badge">🇧🇷 CAMPEONATO BRASILEIRO OFICIAL DE BEACH TENNIS</span>
        </div>
      </div>

      <!-- MENSAGEM DE ALERTA/ERRO -->
      <div id="portal-feedback" class="portal-feedback" style="display: none;"></div>

      <!-- FORMULÁRIO DE ACESSO -->
      <form id="cbt-login-form" class="portal-form" onsubmit="window.handlePortalLogin(event)">
        <div class="portal-form-group">
          <label for="portal-username" class="portal-label">
            <span class="label-icon">👤</span> Usuário Autorizado:
          </label>
          <div class="portal-input-wrapper">
            <input 
              type="text" 
              id="portal-username" 
              class="portal-input" 
              placeholder="Digite seu usuário" 
              value="" 
              autocomplete="off"
              required
            >
          </div>
        </div>

        <div class="portal-form-group">
          <label for="portal-password" class="portal-label">
            <span class="label-icon">🔒</span> Senha de Acesso:
          </label>
          <div class="portal-input-wrapper">
            <input 
              type="password" 
              id="portal-password" 
              class="portal-input" 
              placeholder="Digite a senha de administrador" 
              autocomplete="current-password"
              required
            >
            <button type="button" class="portal-pw-toggle" onclick="window.togglePortalPasswordVisibility()" title="Mostrar/Ocultar Senha">
              👁️
            </button>
          </div>
        </div>

        <div class="portal-options-row" style="justify-content: flex-end;">
          <span class="portal-security-badge">🛡️ Acesso Seguro CBT</span>
        </div>

        <button type="submit" id="portal-btn-submit" class="portal-btn-primary">
          <span class="btn-text">Entrar no Sistema Oficial</span>
          <span class="btn-arrow">→</span>
        </button>
      </form>

      <!-- DIVISOR -->
      <div class="portal-divider">
        <span>OU ACOMPANHE AS DISPUTAS</span>
      </div>

      <!-- BOTÃO VISITANTE / ESPECTADOR AO VIVO -->
      <button type="button" class="portal-btn-secondary" onclick="window.handlePortalGuestLogin()">
        <span class="secondary-icon">🎾</span>
        <div class="secondary-text">
          <strong>Acessar como Visitante / Espectador</strong>
          <small>Consultar confrontos, resultados e ranking em tempo real</small>
        </div>
        <span class="secondary-tag">AO VIVO</span>
      </button>

      <!-- RODAPÉ DO CARD COM STATUS AO VIVO -->
      <div class="portal-footer">
        <div class="portal-sync-status">
          <span class="sync-dot"></span>
          <span class="sync-label">Transmissão Oficial de Chaves e Resultados em Tempo Real</span>
        </div>
        <div class="portal-copyright">
          © 2026 Confederação Brasileira de Tênis • Todos os direitos reservados
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(portalDiv);
}

// Handlers globais de eventos do formulário do portal
window.handlePortalLogin = function (e) {
  e.preventDefault();
  const userInput = document.getElementById('portal-username');
  const passInput = document.getElementById('portal-password');
  const rememberCheckbox = document.getElementById('portal-remember');
  const feedback = document.getElementById('portal-feedback');
  const card = document.querySelector('.cbt-portal-card');

  const username = userInput ? userInput.value : '';
  const password = passInput ? passInput.value : '';
  const remember = rememberCheckbox ? rememberCheckbox.checked : false;

  const result = auth.login(username, password, remember);

  if (result.success) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'portal-feedback success';
      feedback.innerHTML = '✓ Login aprovado! Acessando painel de gerenciamento...';
    }

    setTimeout(() => {
      hideLoginPortal();
      if (window.toast && typeof window.toast.show === 'function') {
        window.toast.show({
          title: 'Bem-vindo, Baumann!',
          message: 'Painel da Copa Federações liberado com acesso de Administrador CBT.',
          type: 'success'
        });
      }
    }, 450);
  } else {
    if (card) {
      card.classList.add('portal-shake');
      setTimeout(() => card.classList.remove('portal-shake'), 600);
    }
    if (feedback) {
      feedback.style.display = 'block';
      feedback.className = 'portal-feedback error';
      feedback.innerHTML = `⚠️ ${result.message}`;
    }
    if (passInput) {
      passInput.value = '';
      passInput.focus();
    }
  }
};

window.handlePortalGuestLogin = function () {
  auth.loginAsGuest();
  hideLoginPortal();
  if (window.toast && typeof window.toast.show === 'function') {
    window.toast.show({
      title: 'Acesso Visitante',
      message: 'Você está no modo de visualização em tempo real das chaves e do ranking.',
      type: 'info'
    });
  }
};

window.togglePortalPasswordVisibility = function () {
  const passInput = document.getElementById('portal-password');
  if (passInput) {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  }
};

window.showLoginPortal = showLoginPortal;
window.hideLoginPortal = hideLoginPortal;

// ============================================================
// MODAL DE GESTÃO DE USUÁRIOS (ACESSADO PELO BOTÃO DO USUÁRIO LOGADO)
// ============================================================
export function openUserManagerModal() {
  if (!auth.isAdmin()) {
    showLoginPortal();
    return;
  }

  const overlay = document.getElementById('user-modal-overlay');
  if (!overlay) return;

  const users = (window.store && typeof window.store.getUsers === 'function')
    ? window.store.getUsers()
    : [{ id: 'u_baumann', username: 'Baumann', name: 'Baumann', password: 'Daniel0306', role: 'admin' }];

  const current = auth.getCurrentUser() || { displayName: 'Baumann', username: 'Baumann' };

  overlay.innerHTML = `
    <div class="modal-card" style="max-width: 620px; width: 100%; max-height: 90vh; overflow-y: auto; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); border: 1px solid var(--border-light);">
      
      <!-- CABEÇALHO DO MODAL -->
      <div class="modal-header" style="background: linear-gradient(135deg, #071b2c 0%, #032b27 100%); color: white; padding: 1.15rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); border-bottom: 2px solid #ffb703;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">👥</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0; color: #ffffff;">Gestão e Configuração de Usuários</h3>
            <small style="color: #cbd5e1;">Acesso Administrador CBT • Conectado como <strong>${current.displayName}</strong></small>
          </div>
        </div>
        <button class="modal-close" onclick="window.closeUserManagerModal()" style="color: white; background: none; border: none; font-size: 1.3rem; cursor: pointer; opacity: 0.85;">✕</button>
      </div>

      <!-- CORPO DO MODAL -->
      <div class="modal-body" style="padding: 1.4rem; display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- CARD 1: ALTERAR SENHA DO USUÁRIO ADMINISTRADOR -->
        <div style="border: 1px solid #cbd5e1; border-radius: var(--radius-md); padding: 1.15rem; background: #f8fafc;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
              🔑 Alterar Senha de <strong>${current.displayName}</strong>
            </h4>
            <span style="font-size: 0.72rem; font-weight: 800; color: #047857; background: #ecfdf5; padding: 0.15rem 0.5rem; border-radius: 9999px;">
              Admin Ativo
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Nova Senha:</label>
              <input type="password" id="user-mgmt-new-pass" class="form-control" placeholder="Mínimo 4 caracteres" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Confirmar Senha:</label>
              <input type="password" id="user-mgmt-confirm-pass" class="form-control" placeholder="Repita a nova senha" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
            </div>
          </div>

          <div style="margin-top: 0.85rem; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-primary btn-sm" onclick="window.handleUpdateUserPassword('${current.username}')" style="font-weight: 700; font-size: 0.8rem; padding: 0.45rem 1rem;">
              💾 Salvar Nova Senha
            </button>
          </div>
        </div>

        <!-- CARD 2: CADASTRAR NOVO USUÁRIO -->
        <div style="border: 1px solid #cbd5e1; border-radius: var(--radius-md); padding: 1.15rem; background: #ffffff;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
            ➕ Cadastrar Novo Usuário / Mesário
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Nome de Exibição:</label>
              <input type="text" id="new-user-name" class="form-control" placeholder="Ex: Diretor de Quadra" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Usuário / Login:</label>
              <input type="text" id="new-user-login" class="form-control" placeholder="Ex: arbitro1" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Senha Inicial:</label>
              <input type="password" id="new-user-password" class="form-control" placeholder="Senha do novo usuário" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Perfil de Acesso:</label>
              <select id="new-user-role" class="form-select" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
                <option value="admin">🏆 Administrador (Acesso Total)</option>
                <option value="operator">📝 Operador / Mesário</option>
              </select>
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.handleCreateNewUser()" style="font-weight: 700; font-size: 0.8rem; padding: 0.45rem 1rem;">
              ➕ Adicionar Usuário
            </button>
          </div>
        </div>

        <!-- CARD 3: TABELA DE USUÁRIOS ATIVOS -->
        <div style="border: 1px solid #cbd5e1; border-radius: var(--radius-md); padding: 1.15rem; background: #ffffff;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
            <span>📋 Usuários com Acesso (${users.length})</span>
            <small style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">Sincronizado na nuvem</small>
          </h4>
          <div style="overflow-x: auto;">
            <table class="custom-table" style="font-size: 0.82rem; margin: 0; width: 100%;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="padding: 0.5rem 0.75rem;">Nome</th>
                  <th style="padding: 0.5rem 0.75rem;">Login</th>
                  <th style="padding: 0.5rem 0.75rem;">Perfil</th>
                  <th style="padding: 0.5rem 0.75rem; text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 0.5rem 0.75rem;"><strong>${u.name || u.username}</strong></td>
                    <td style="padding: 0.5rem 0.75rem;"><code style="background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px;">${u.username}</code></td>
                    <td style="padding: 0.5rem 0.75rem;">
                      <span style="font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 9999px; background: ${u.role === 'admin' ? '#fef3c7' : '#e0f2fe'}; color: ${u.role === 'admin' ? '#92400e' : '#0369a1'};">
                        ${u.role === 'admin' ? '🏆 Admin' : '📝 Operador'}
                      </span>
                    </td>
                    <td style="padding: 0.5rem 0.75rem; text-align: right;">
                      ${u.username.toLowerCase() === 'baumann' ? `
                        <span style="font-size: 0.72rem; font-weight: 700; color: #028090;">Principal</span>
                      ` : `
                        <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; font-size: 0.72rem; padding: 0.2rem 0.55rem;" onclick="window.handleDeleteUser('${u.id}')">
                          🗑️ Excluir
                        </button>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- RODAPÉ DO MODAL -->
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.4rem; border-top: 1px solid #cbd5e1; background: #f8fafc; border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg);">
        <button type="button" class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5; font-weight: 700;" onclick="window.closeUserManagerModal(); window.auth.logout();">
          🚪 Sair da Conta (Logout)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeUserManagerModal()" style="font-weight: 700;">
          Fechar
        </button>
      </div>

    </div>
  `;

  overlay.classList.add('active');
}

export function closeUserManagerModal() {
  const overlay = document.getElementById('user-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

window.openUserManagerModal = openUserManagerModal;
window.closeUserManagerModal = closeUserManagerModal;

// Handler para alterar a senha
window.handleUpdateUserPassword = function (username) {
  const newPass = document.getElementById('user-mgmt-new-pass')?.value || '';
  const confirmPass = document.getElementById('user-mgmt-confirm-pass')?.value || '';

  if (newPass.length < 4) {
    alert('A nova senha deve ter pelo menos 4 caracteres.');
    return;
  }
  if (newPass !== confirmPass) {
    alert('A confirmação de senha não confere com a nova senha.');
    return;
  }

  if (window.store && typeof window.store.saveUser === 'function') {
    const users = window.store.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      user.password = newPass;
      window.store.saveUser(user);
      toast.show({
        title: 'Senha Atualizada!',
        message: `A senha de ${user.name || user.username} foi alterada e sincronizada com sucesso.`,
        type: 'success'
      });
      document.getElementById('user-mgmt-new-pass').value = '';
      document.getElementById('user-mgmt-confirm-pass').value = '';
    }
  }
};

// Handler para criar novo usuário
window.handleCreateNewUser = function () {
  const name = document.getElementById('new-user-name')?.value.trim();
  const username = document.getElementById('new-user-login')?.value.trim();
  const password = document.getElementById('new-user-password')?.value.trim();
  const role = document.getElementById('new-user-role')?.value || 'operator';

  if (!name || !username || !password) {
    alert('Preencha todos os campos (Nome, Usuário e Senha) para cadastrar o novo usuário.');
    return;
  }

  if (password.length < 4) {
    alert('A senha deve ter pelo menos 4 caracteres.');
    return;
  }

  if (window.store && typeof window.store.saveUser === 'function') {
    window.store.saveUser({
      name,
      username,
      password,
      role
    });

    toast.show({
      title: 'Usuário Criado!',
      message: `Usuário ${username} cadastrado com sucesso.`,
      type: 'success'
    });

    // Re-renderiza o modal atualizado
    openUserManagerModal();
  }
};

// Handler para excluir usuário
window.handleDeleteUser = function (userId) {
  if (!confirm('Deseja realmente remover o acesso deste usuário?')) return;

  if (window.store && typeof window.store.deleteUser === 'function') {
    const res = window.store.deleteUser(userId);
    if (res.success) {
      toast.show({
        title: 'Usuário Removido',
        message: 'O usuário foi excluído do sistema.',
        type: 'info'
      });
      openUserManagerModal();
    } else {
      alert(res.message || 'Erro ao remover usuário.');
    }
  }
};

