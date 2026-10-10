// Módulo de Configuração do Torneio, Categorias, Tabela de Pontos e Firebase Realtime
import { store } from '../data/store.js';
import { toast } from './toast.js';
import { DEFAULT_POINTS_TABLE } from '../data/categories.js';
import { auth } from './auth.js';
import { firebaseService, getFirebaseCredentials, saveFirebaseCredentials, clearFirebaseCredentials } from '../data/firebaseClient.js';

const FIREBASE_RULES_JSON = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`;

export function initConfigView() {
  // Salvar Metadados do Torneio
  window.handleSaveTournamentMetadata = (e) => {
    e.preventDefault();
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode alterar dados do torneio.', type: 'warning' });
      return;
    }
    const nome = document.getElementById('cfg-tourn-nome').value.trim();
    const local = document.getElementById('cfg-tourn-local').value.trim();
    const dataInicio = document.getElementById('cfg-tourn-inicio').value;
    const horaInicio = document.getElementById('cfg-tourn-hora-inicio')?.value || '08:00';
    const dataFim = document.getElementById('cfg-tourn-fim').value;
    const status = document.getElementById('cfg-tourn-status').value;
    const tempoMedio = parseInt(document.getElementById('cfg-tourn-tempo-jogo').value, 10) || 50;
    const tempoAquec = parseInt(document.getElementById('cfg-tourn-tempo-aquec').value, 10) || 10;

    store.updateTournament({
      nome,
      local,
      dataInicio,
      horaInicio,
      dataFim,
      status,
      tempoMedioJogoMin: tempoMedio,
      tempoAquecimentoMin: tempoAquec
    });

    toast.show({
      title: 'Configurações Salvas',
      message: 'Os dados do torneio foram atualizados.',
      type: 'success'
    });
  };

  // Ativar/Desativar Categorias
  window.handleToggleCategory = (catId, checked) => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode ativar/desativar categorias.', type: 'warning' });
      renderConfig();
      return;
    }
    store.toggleCategory(catId, checked);
    toast.show({
      title: 'Categoria Atualizada',
      message: `Categoria ${checked ? 'ativada' : 'desativada'}.`,
      type: 'info'
    });
  };

  // Salvar Tabela de Pontos
  window.handleSavePointsTable = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode alterar a tabela de pontos.', type: 'warning' });
      return;
    }
    const inputs = document.querySelectorAll('.points-table-input');
    const newTable = {};
    inputs.forEach(input => {
      const pos = parseInt(input.dataset.pos, 10);
      const val = parseInt(input.value, 10);
      newTable[pos] = isNaN(val) ? (DEFAULT_POINTS_TABLE[pos] || 0) : val;
    });

    store.updatePointsTable(newTable);
    toast.show({
      title: 'Tabela de Pontos Salva',
      message: 'A pontuação das colocações foi atualizada para o ranking geral.',
      type: 'success'
    });
  };

  // Restaurar Tabela de Pontos Padrão CBT
  window.handleRestoreDefaultPointsTable = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode restaurar configurações oficiais.', type: 'warning' });
      return;
    }
    store.restoreDefaultPointsTable();
    toast.show({
      title: 'Padrão Oficial CBT Restaurado',
      message: 'A pontuação padrão oficial (1º ao 27º lugar) foi restaurada com sucesso.',
      type: 'success'
    });
    renderConfig();
  };

  // Exportar Backup JSON
  window.handleExportBackup = () => {
    const jsonStr = store.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copa_federacoes_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show({ title: 'Backup Gerado', message: 'O arquivo JSON foi baixado.', type: 'success' });
  };

  // Importar Backup JSON
  window.handleImportBackup = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode restaurar backups.', type: 'warning' });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = store.importJSON(event.target.result);
        if (res.success) {
          toast.show({ title: 'Dados Importados', message: 'O backup foi restaurado com sucesso!', type: 'success' });
          renderConfig();
        } else {
          toast.show({ title: 'Erro na Importação', message: res.message, type: 'error' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Redefinir Dados Locais
  window.handleResetAllData = () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador (Baumann) pode reiniciar os dados.', type: 'warning' });
      return;
    }
    if (confirm('ATENÇÃO: Deseja redefinir todos os dados para o estado inicial da Copa Federações 2026? Todos os resultados preenchidos serão resetados.')) {
      store.resetAllData();
      toast.show({ title: 'Dados Reiniciados', message: 'As chaves e 27 federações foram restauradas.', type: 'warning' });
      renderConfig();
    }
  };

  // ─── HANDLERS DO FIREBASE ──────────────────────────────────────
  // Salvar Credenciais do Firebase
  window.handleSaveFirebaseConfig = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador pode alterar a URL da nuvem.', type: 'warning' });
      return;
    }

    const urlInput = document.getElementById('cfg-firebase-url');
    if (!urlInput) return;

    const url = urlInput.value.trim();
    if (!url) {
      toast.show({ title: 'Campo Obrigatório', message: 'Informe a URL do Realtime Database.', type: 'warning' });
      return;
    }

    saveFirebaseCredentials(url);
    toast.show({ title: 'URL Salva', message: 'Conectando ao Firebase...', type: 'info' });

    await firebaseService.reconnect();
    renderConfig();
  };

  // Testar Conexão com o Firebase
  window.handleTestFirebaseConnection = async () => {
    const urlInput = document.getElementById('cfg-firebase-url');
    const statusBox = document.getElementById('firebase-test-feedback');
    const btnTest = document.getElementById('btn-test-firebase');

    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.innerHTML = '<span style="color: #ef4444;">⚠️ Digite a URL do Realtime Database antes de testar.</span>';
      }
      return;
    }

    if (btnTest) {
      btnTest.disabled = true;
      btnTest.textContent = '⏳ Testando...';
    }

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.innerHTML = '<span style="color: #3b82f6;">🔄 Conectando ao Firebase Realtime Database...</span>';
    }

    const result = await firebaseService.testConnection(url);

    if (btnTest) {
      btnTest.disabled = false;
      btnTest.textContent = '🔍 Testar Conexão';
    }

    if (statusBox) {
      statusBox.style.display = 'block';
      if (result.normalizedUrl && urlInput && urlInput.value.trim() !== result.normalizedUrl) {
        urlInput.value = result.normalizedUrl;
      }
      if (result.success) {
        statusBox.innerHTML = `<span style="color: #10b981; font-weight: 700;">${result.message}</span>`;
        toast.show({ title: 'Firebase Conectado!', message: 'Comunicação validada com sucesso!', type: 'success' });
      } else {
        statusBox.innerHTML = `<span style="color: #ef4444; font-weight: 600;">${result.message}</span>`;
        toast.show({ title: 'Atenção', message: result.message, type: 'error', duration: 6000 });
      }
    }
  };

  // Forçar envio local para o Firebase
  window.handleForcePushFirebase = async () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador pode enviar dados para a nuvem.', type: 'warning' });
      return;
    }

    toast.show({ title: 'Enviando...', message: 'Subindo estado atual para o Firebase...', type: 'info' });
    const res = await firebaseService.forcePush();
    if (res.success) {
      toast.show({ title: '🔥 Sucesso', message: res.message, type: 'success' });
    } else {
      toast.show({ title: 'Erro de Envio', message: res.message, type: 'error', duration: 5000 });
    }
  };

  // Forçar download do Firebase para o aparelho
  window.handleForcePullFirebase = async () => {
    toast.show({ title: 'Buscando...', message: 'Consultando versão mais recente no Firebase...', type: 'info' });
    const res = await firebaseService.forcePull();
    if (res.success) {
      toast.show({ title: 'Firebase Carregado', message: res.message, type: 'success' });
      renderConfig();
    } else {
      toast.show({ title: 'Não foi possível baixar', message: res.message, type: 'warning' });
    }
  };

  // Copiar Regras do Firebase
  window.handleCopyFirebaseRules = () => {
    navigator.clipboard.writeText(FIREBASE_RULES_JSON).then(() => {
      toast.show({
        title: '📋 Regras do Firebase Copiadas!',
        message: 'Cole na aba "Rules" do Realtime Database e clique em Publish.',
        type: 'success',
        duration: 4000
      });
    }).catch(() => {
      prompt('Copie o JSON de regras abaixo:', FIREBASE_RULES_JSON);
    });
  };

  // Restaurar URL padrão do Firebase
  window.handleResetFirebaseConfig = async () => {
    if (!auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas o administrador pode redefinir configurações.', type: 'warning' });
      return;
    }
    if (confirm('Deseja limpar a URL salva e restaurar a configuração padrão?')) {
      clearFirebaseCredentials();
      toast.show({ title: 'Padrão Restaurado', message: 'Reconectando...', type: 'info' });
      await firebaseService.reconnect();
      renderConfig();
    }
  };
}

export function renderConfig() {
  const container = document.getElementById('view-configuracoes');
  if (!container) return;

  const tournament = store.getTournament();
  const categories = store.getCategories();
  const pointsTable = store.getPointsTable();
  const fbCreds = getFirebaseCredentials();
  const fbStatus = firebaseService.getStatus();

  // Status visual
  let statusBadgeHtml = '';
  if (fbStatus.status === 'connected') {
    statusBadgeHtml = `<span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700;">🟢 Firebase Conectado em Tempo Real</span>`;
  } else if (fbStatus.status === 'syncing') {
    statusBadgeHtml = `<span style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #f59e0b; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700;">🟡 Sincronizando...</span>`;
  } else if (fbStatus.status === 'connecting') {
    statusBadgeHtml = `<span style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #f59e0b; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700;">🟡 Conectando...</span>`;
  } else {
    statusBadgeHtml = `<span style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700;">🔴 Desconectado / Erro</span>`;
  }

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
          ⚙️ Configuração Oficial do Torneio
        </h2>
        <p style="color: #cbd5e1; font-size: 0.9rem; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">
          Gerencie a sincronização em nuvem Firebase, regras CBT, categorias ativas e pontuação oficial
        </p>
      </div>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        ${auth.isAdmin() ? `
        <button class="btn btn-outline btn-sm" style="color: #ffffff; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1);" onclick="window.handleExportBackup()">💾 Exportar Backup</button>
        <button class="btn btn-outline btn-sm" style="color: #ffffff; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1);" onclick="window.handleImportBackup()">📥 Importar Backup</button>
        <button class="btn btn-danger btn-sm" onclick="window.handleResetAllData()" style="color: #ffffff; background: #ef4444; border-color: #ef4444;">⚠️ Redefinir Dados</button>
        ` : ''}
      </div>
    </div>

    <!-- CARD PRINCIPAL: SINCRONIZAÇÃO EM NUVEM (FIREBASE REALTIME DATABASE) -->
    <div class="card" style="margin-bottom: 1.5rem; border-left: 4px solid #f59e0b; background: #ffffff;">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h3 class="card-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <span>🔥</span> Sincronização em Tempo Real — Firebase (Google)
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
            <strong>100% Gratuito e Nunca Pausa por Inatividade.</strong> Atualizações instantâneas entre o computador central, celulares e telões.
          </p>
        </div>
        <div>
          ${statusBadgeHtml}
        </div>
      </div>

      <form onsubmit="window.handleSaveFirebaseConfig(event)">
        <fieldset style="border: none; padding: 0; margin: 0;" ${!auth.isAdmin() ? 'disabled' : ''}>
          <div style="margin-bottom: 1rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-weight: 700;">
                🌐 URL do Firebase Realtime Database:
              </label>
              <input 
                type="url" 
                id="cfg-firebase-url" 
                class="form-control" 
                placeholder="Ex: https://meu-projeto-default-rtdb.firebaseio.com" 
                value="${fbCreds.databaseURL}" 
                required
              >
              <span style="font-size: 0.75rem; color: var(--text-muted);">Encontrada no topo da página de Realtime Database no Firebase Console.</span>
            </div>
          </div>

          <div id="firebase-test-feedback" style="display: none; padding: 0.6rem 0.9rem; border-radius: var(--radius-xs); background: #f8fafc; border: 1px solid var(--border-light); font-size: 0.85rem; margin-bottom: 1rem;"></div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${auth.isAdmin() ? `
              <button type="submit" class="btn btn-primary btn-sm">💾 Salvar e Conectar</button>
              <button type="button" id="btn-test-firebase" class="btn btn-outline btn-sm" onclick="window.handleTestFirebaseConnection()">🔍 Testar Conexão</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.handleForcePushFirebase()" title="Envia todos os dados locais atuais deste aparelho para o Firebase">⬆️ Forçar Envio para Nuvem</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.handleForcePullFirebase()" title="Baixa a versão oficial mais recente salva no Firebase">⬇️ Baixar da Nuvem</button>
              ` : `
              <button type="button" id="btn-test-firebase" class="btn btn-outline btn-sm" onclick="window.handleTestFirebaseConnection()">🔍 Testar Conexão</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.handleForcePullFirebase()">⬇️ Atualizar Agora da Nuvem</button>
              `}
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.handleCopyFirebaseRules()" style="border-color: #f59e0b; color: #b45309; font-weight: 700;">
                📋 Copiar Regras de Acesso (JSON)
              </button>
              ${auth.isAdmin() && fbCreds.isCustom ? `
              <button type="button" class="btn btn-outline btn-sm" onclick="window.handleResetFirebaseConfig()" style="color: #64748b;" title="Restaura a URL padrão">
                ↺ Restaurar Padrão
              </button>
              ` : ''}
            </div>
          </div>
        </fieldset>
      </form>

      <!-- PASSO A PASSO ILUSTRADO FIREBASE -->
      <div style="margin-top: 1.25rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 1rem;">
        <strong style="color: #92400e; font-size: 0.875rem; display: block; margin-bottom: 0.5rem;">
          📖 Como criar e conectar seu banco de dados Firebase em 3 minutos:
        </strong>
        <ol style="font-size: 0.825rem; color: #78350f; padding-left: 1.25rem; line-height: 1.7; margin: 0;">
          <li>Acesse o <a href="https://console.firebase.google.com" target="_blank" style="color: #b45309; font-weight: 700; text-decoration: underline;">Firebase Console</a> com sua conta Google e clique em <strong>"Adicionar projeto"</strong> (ex: <code>copa-federacoes-2026</code>).</li>
          <li>No menu lateral esquerdo, vá em <strong>Build (Construção) → Realtime Database</strong> → clique em <strong>Criar banco de dados</strong> (escolha qualquer localidade, ex: Estados Unidos <code>us-central1</code>).</li>
          <li>Após criar, clique na aba <strong>Rules (Regras)</strong>, clique no botão <strong>"📋 Copiar Regras de Acesso (JSON)"</strong> acima, cole lá substituindo tudo e clique em <strong>Publish (Publicar)</strong>.</li>
          <li>Pronto! Copie a URL que aparece no topo da aba <em>Data</em> (algo como <code>https://seu-projeto-default-rtdb.firebaseio.com</code>), cole no campo acima e clique em <strong>"Salvar e Conectar"</strong>!</li>
        </ol>
      </div>
    </div>

    <!-- GRADE DE CONFIGURAÇÕES DO TORNEIO -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- FORMULÁRIO DADOS DO TORNEIO -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🏆 Dados Oficiais do Torneio</h3>
        </div>
        <form onsubmit="window.handleSaveTournamentMetadata(event)">
          <fieldset style="border: none; padding: 0; margin: 0;" ${!auth.isAdmin() ? 'disabled' : ''}>
          <div class="form-group">
            <label class="form-label">Nome Oficial do Torneio:</label>
            <input type="text" id="cfg-tourn-nome" class="form-control" value="${tournament.nome}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Local / Arena:</label>
            <input type="text" id="cfg-tourn-local" class="form-control" value="${tournament.local}" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Data Início:</label>
              <input type="date" id="cfg-tourn-inicio" class="form-control" value="${tournament.dataInicio}">
            </div>
            <div class="form-group">
              <label class="form-label">Hora Início:</label>
              <input type="time" id="cfg-tourn-hora-inicio" class="form-control" value="${tournament.horaInicio || '08:00'}">
            </div>
            <div class="form-group">
              <label class="form-label">Data Fim:</label>
              <input type="date" id="cfg-tourn-fim" class="form-control" value="${tournament.dataFim}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Tempo Médio Jogo (min):</label>
              <input type="number" id="cfg-tourn-tempo-jogo" class="form-control" value="${tournament.tempoMedioJogoMin || 50}">
            </div>
            <div class="form-group">
              <label class="form-label">Aquecimento (min):</label>
              <input type="number" id="cfg-tourn-tempo-aquec" class="form-control" value="${tournament.tempoAquecimentoMin || 10}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Status do Torneio:</label>
            <select id="cfg-tourn-status" class="form-select">
              <option value="rascunho" ${tournament.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
              <option value="ativo" ${tournament.status === 'ativo' ? 'selected' : ''}>Ativo (Em Disputa)</option>
              <option value="encerrado" ${tournament.status === 'encerrado' ? 'selected' : ''}>Encerrado</option>
            </select>
          </div>

          ${auth.isAdmin() ? `<button type="submit" class="btn btn-primary mt-2">Salvar Informações</button>` : ''}
          </fieldset>
        </form>
      </div>

      <!-- TABELA DE PONTUAÇÃO CBT EDITÁVEL -->
      <div class="card">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 class="card-title">🏅 Tabela de Pontos por Colocação</h3>
            <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">★ Padrão Oficial CBT (1º ao 27º)</span>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${auth.isAdmin() ? `
            <button class="btn btn-outline btn-sm" onclick="window.handleRestoreDefaultPointsTable()" title="Restaura os valores oficiais padrão CBT (1º: 55 pts até 27º: 1 pt)">Restaurar Padrão Oficial</button>
            <button class="btn btn-primary btn-sm" onclick="window.handleSavePointsTable()">Salvar Pontos</button>
            ` : ''}
          </div>
        </div>

        <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Esta pontuação é registrada como <strong>padrão permanente do sistema</strong> (1º: 55 pts até 27º: 1 pt). O ranking geral calcula automaticamente a pontuação das federações com base nestes valores:
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; max-height: 380px; overflow-y: auto; padding-right: 0.35rem;">
          <fieldset style="display: contents;" ${!auth.isAdmin() ? 'disabled' : ''}>
          ${Array.from({ length: 27 }, (_, i) => i + 1).map(pos => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-subtle); padding: 0.4rem 0.6rem; border-radius: var(--radius-xs);">
              <span style="font-weight: 700; font-size: 0.8rem;">${pos}º lugar:</span>
              <input type="number" class="form-control points-table-input" style="width: 65px; padding: 0.2rem 0.4rem; font-size: 0.85rem; text-align: center;" data-pos="${pos}" value="${pointsTable[pos] || 0}">
            </div>
          `).join('')}
          </fieldset>
        </div>
      </div>
    </div>

    <!-- SEGUNDA LINHA: CATEGORIAS OFICIAIS DO TORNEIO -->
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">🎾 Categorias Oficiais do Torneio (${categories.length})</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
            Ative ou desative as categorias participantes da Copa Federações
          </p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.75rem;">
        ${categories.map(cat => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-sm); background: #ffffff;">
            <div>
              <strong style="color: var(--accent-dark-blue); font-size: 0.95rem;">${cat.nome}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${cat.formato}</div>
            </div>

            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; font-weight: 600;">
              <input type="checkbox" ${cat.ativa ? 'checked' : ''} onchange="window.handleToggleCategory('${cat.id}', this.checked)" ${!auth.isAdmin() ? 'disabled' : ''}>
              ${cat.ativa ? 'Ativa' : 'Desativada'}
            </label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
