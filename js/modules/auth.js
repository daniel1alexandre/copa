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
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (cleanUser.toLowerCase() === ADMIN_USERNAME.toLowerCase() && cleanPass === ADMIN_PASSWORD) {
      const sessionData = {
        username: ADMIN_USERNAME,
        role: 'admin',
        displayName: 'Baumann',
        label: 'Administrador CBT',
        loginTime: new Date().toISOString()
      };
      this.saveSession(sessionData, remember);
      return { success: true, user: sessionData };
    }

    return {
      success: false,
      message: 'Usuário ou senha incorretos! Digite o usuário Baumann e a senha oficial.'
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
    const userInput = document.getElementById('portal-username');
    if (userInput && !userInput.value) {
      userInput.value = 'Baumann';
    }
    const passInput = document.getElementById('portal-password');
    if (passInput) {
      passInput.focus();
    }
  }
}

export function hideLoginPortal() {
  const portal = document.getElementById('cbt-login-portal');
  if (portal) {
    portal.classList.remove('active');
    document.body.classList.remove('portal-open');
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
      <div class="user-pill admin-pill" title="Acesso total como Administrador CBT">
        <div class="user-pill-avatar">🏆</div>
        <div class="user-pill-info">
          <span class="user-pill-name">${current.displayName}</span>
          <span class="user-pill-role">Admin CBT</span>
        </div>
        <button class="user-pill-logout" onclick="window.auth.logout()" title="Sair da conta">
          ✕
        </button>
      </div>
    `;
  } else {
    badgeContainer.innerHTML = `
      <div class="user-pill guest-pill" title="Acesso em modo leitura em tempo real">
        <div class="user-pill-avatar">👁️</div>
        <div class="user-pill-info">
          <span class="user-pill-name">Ao Vivo</span>
          <span class="user-pill-role">Espectador</span>
        </div>
        <button class="btn-upgrade-login" onclick="window.showLoginPortal()" title="Fazer Login como Administrador">
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
              placeholder="Digite seu usuário (Ex: Baumann)" 
              value="Baumann" 
              autocomplete="username"
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
