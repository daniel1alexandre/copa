// Módulo Menu Categoria: Gestão de Categorias e Estados Participantes
import { store } from '../data/store.js';
import { toast } from './toast.js';

let selectedCategoryId = 'prof';

export function initCategoryView() {
  window.selectCategoryTab = (catId) => {
    selectedCategoryId = catId;
    window.selectedTournamentCategory = catId;
    if (typeof window.switchBracketCategory === 'function') {
      window.switchBracketCategory(catId);
    }
    renderCategoryView();
  };

  // Alteração individual de slot de BYE por ranking (1º, 2º, 3º...)
  window.handleByeSlotSelectChange = (slotIndex, fedId) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem alterar os BYEs.', type: 'error' });
      return;
    }

    const participatingFeds = store.getCategoryParticipatingFeds(selectedCategoryId);
    const validPartIds = participatingFeds.map(f => f.id);

    if (fedId && !validPartIds.includes(fedId)) {
      alert('O estado selecionado precisa estar na lista de participantes desta categoria.');
      return;
    }

    const slotPos = slotIndex + 1;
    store.setCategoryDrawnSeed(selectedCategoryId, slotPos, fedId || null);
    renderCategoryView();
  };

  // Desmarcar e reabilitar um estado do BYE da categoria
  window.handleUnselectCategoryBye = (fedId) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem alterar os BYEs.', type: 'error' });
      return;
    }

    const byes = store.getCategoryByes(selectedCategoryId);
    const idx = byes.indexOf(fedId);
    if (idx !== -1) {
      const slotPos = idx + 1;
      store.setCategoryDrawnSeed(selectedCategoryId, slotPos, null);

      const fed = store.getFederations().find(f => f.id === fedId);
      toast.show({
        title: 'Estado Desmarcado',
        message: `${fed?.nome || fedId} desmarcado da vaga de BYE.`,
        type: 'info',
        duration: 2500
      });
      renderCategoryView();
    }
  };

  // Selecionar um estado disponível para o próximo slot livre de BYE
  window.handlePickCategoryBye = (fedId) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem alterar os BYEs.', type: 'error' });
      return;
    }

    const participatingFeds = store.getCategoryParticipatingFeds(selectedCategoryId);
    const numByes = Math.max(0, 32 - participatingFeds.length);
    const byes = store.getCategoryByes(selectedCategoryId);

    if (byes.includes(fedId)) return;

    const firstEmptyIndex = byes.findIndex(b => !b);
    if (firstEmptyIndex === -1 && byes.length >= numByes) {
      toast.show({
        title: 'Todas as Vagas Preenchidas',
        message: `Todas as ${numByes} vagas de BYE desta categoria já estão ocupadas. Clique no check (✓) de um estado para desmarcar e liberar vaga.`,
        type: 'warning',
        duration: 3500
      });
      return;
    }

    const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : byes.length;
    const slotPos = targetIndex + 1;
    store.setCategoryDrawnSeed(selectedCategoryId, slotPos, fedId);
    const fed = store.getFederations().find(f => f.id === fedId);
    toast.show({
      title: 'BYE Definido',
      message: `${fed?.nome || fedId} alocado como ${slotPos}º Ranking (Passa de BYE)!`,
      type: 'success',
      duration: 2500
    });
    renderCategoryView();
  };

  // Preenchimento automático com base nos melhores rankings/seeds (Cabeças de Chave oficiais e sorteados)
  window.handleAutoFillSeeds = () => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem preencher BYEs.', type: 'error' });
      return;
    }

    const feds = store.getCategoryParticipatingFeds(selectedCategoryId);
    const numByes = Math.max(0, 32 - feds.length);
    if (numByes === 0) {
      toast.show({
        title: 'Sem BYEs',
        message: 'Esta categoria possui 32 participantes e não utiliza BYEs.',
        type: 'info'
      });
      return;
    }

    const autoByes = store.syncCategoryByesFromSeeds(selectedCategoryId, true);
    const filledCount = autoByes.filter(Boolean).length;
    toast.show({
      title: 'Cabeças de Chave Sincronizados!',
      message: `${filledCount} vagas de BYE preenchidas com os Cabeças de Chave oficiais e sorteados da categoria (respeitando o limite de ${numByes} BYEs).`,
      type: 'success'
    });
    renderCategoryView();
  };

  // Limpar todas as vagas de BYE da categoria e os estados selecionados nos confrontos
  window.handleClearAllByes = () => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem limpar BYEs.', type: 'error' });
      return;
    }

    store.clearCategoryByes(selectedCategoryId);
    toast.show({
      title: 'BYEs e Confrontos Limpos',
      message: 'Todas as vagas de BYE e estados selecionados no menu Confrontos foram limpos.',
      type: 'info'
    });
    renderCategoryView();
  };

  // Toggle de participação de uma federação individual
  window.handleToggleCategoryParticipant = (fedId, isChecked) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem alterar participantes.', type: 'error' });
      renderCategoryView();
      return;
    }

    const currentPart = store.getCategoryParticipatingFeds(selectedCategoryId).map(f => f.id);
    let newPart;
    if (isChecked) {
      newPart = Array.from(new Set([...currentPart, fedId]));
    } else {
      newPart = currentPart.filter(id => id !== fedId);
    }

    if (newPart.length < 2) {
      alert('A categoria precisa de pelo menos 2 estados participantes.');
      renderCategoryView();
      return;
    }

    store.setCategoryParticipatingFeds(selectedCategoryId, newPart);
    renderCategoryView();
  };

  // Toggle direto de BYE ao clicar no card da federação
  window.handleToggleCategoryBye = (fedId, event) => {
    if (event && event.target && event.target.tagName.toLowerCase() === 'input') return;
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      return;
    }

    const participatingFeds = store.getCategoryParticipatingFeds(selectedCategoryId);
    const validPartIds = participatingFeds.map(f => f.id);
    if (!validPartIds.includes(fedId)) {
      alert('O estado precisa estar selecionado como participante para receber o BYE.');
      return;
    }

    const numByes = Math.max(0, 32 - participatingFeds.length);
    const byes = [...store.getCategoryByes(selectedCategoryId)];
    const isCurrentlyBye = byes.includes(fedId);

    if (!isCurrentlyBye) {
      if (byes.length >= numByes) {
        alert(`Você só pode definir até ${numByes} estados para passar de BYE nesta categoria (${participatingFeds.length} participantes).`);
        return;
      }
      byes.push(fedId);
    } else {
      const idx = byes.indexOf(fedId);
      if (idx > -1) byes.splice(idx, 1);
    }

    store.setCategoryByes(selectedCategoryId, byes);
    renderCategoryView();
  };

  window.handleToggleCategoryActive = (catId, checked) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem ativar/desativar categorias.', type: 'error' });
      renderCategoryView();
      return;
    }

    store.toggleCategory(catId, checked);
    toast.show({
      title: 'Categoria Atualizada',
      message: `Categoria ${checked ? 'ativada' : 'desativada'}.`,
      type: 'info'
    });
    renderCategoryView();
  };

  window.handleQuickSelectParticipants = (preset) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem alterar participantes.', type: 'error' });
      return;
    }

    const feds = store.getFederations();
    let selectedIds = [];

    if (preset === 'all') {
      selectedIds = feds.map(f => f.id);
    } else if (preset === '26') {
      selectedIds = feds.filter(f => f.uf !== 'AC').map(f => f.id);
    } else if (preset === '25') {
      selectedIds = feds.filter(f => !['AC', 'RR'].includes(f.uf)).map(f => f.id);
    } else if (preset === 'none') {
      selectedIds = [];
    }

    if (selectedIds.length < 2) {
      alert('Selecione pelo menos 2 estados participantes para a categoria.');
      return;
    }

    store.setCategoryParticipatingFeds(selectedCategoryId, selectedIds);
    renderCategoryView();
  };

  window.handleSaveCategoryParticipants = () => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem salvar participantes.', type: 'error' });
      return;
    }

    const checkboxes = document.querySelectorAll('.cat-fed-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length < 2) {
      alert('Selecione pelo menos 2 estados participantes para gerar a chave da categoria.');
      return;
    }

    store.setCategoryParticipatingFeds(selectedCategoryId, selectedIds);

    const numByes = Math.max(0, 32 - selectedIds.length);
    toast.show({
      title: 'Participantes e BYEs Atualizados!',
      message: `Categoria ${store.getCategories().find(c => c.id === selectedCategoryId)?.nome}: ${selectedIds.length} estados participantes e ${numByes} BYEs gerados com sucesso!`,
      type: 'success',
      duration: 6000
    });

    renderCategoryView();
  };

  window.goToBracketWithCategory = (catId) => {
    window.switchTab('chaveamento');
    if (window.switchBracketCategory) {
      window.switchBracketCategory(catId);
    }
  };
}

export function renderCategoryView() {
  const container = document.getElementById('view-categorias');
  if (!container) return;

  if (window.selectedTournamentCategory && window.selectedTournamentCategory !== 'todas') {
    selectedCategoryId = window.selectedTournamentCategory;
  }

  const categories = store.getCategories();
  const currentCat = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const allFeds = [...store.getFederations()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const participatingFeds = store.getCategoryParticipatingFeds(currentCat.id);
  const participatingIds = new Set(participatingFeds.map(f => f.id));
  const totalPart = participatingFeds.length;
  const numByes = Math.max(0, 32 - totalPart);
  const realMatches = Math.max(0, totalPart - 16);
  const byesList = store.getCategoryByes(currentCat.id);
  window.filterCategoryByeList = () => {
    const input = document.getElementById('cat-bye-state-filter');
    const term = (input?.value || '').toLowerCase().trim();
    const items = document.querySelectorAll('#cat-bye-state-items-container .state-select-item');
    items.forEach(el => {
      const name = el.querySelector('.state-item-name')?.textContent?.toLowerCase() || '';
      el.style.display = (!term || name.includes(term)) ? 'flex' : 'none';
    });
  };

  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());

  container.innerHTML = `
    <!-- HEADER DA GESTÃO DE CATEGORIAS -->
    <div style="background: linear-gradient(135deg, #091b2c 0%, #004b57 60%, #028090 100%); border-radius: var(--radius-lg); padding: 1.5rem; color: white; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-md);">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 183, 3, 0.2); color: #ffb703; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
          🎾 Configuração de Categorias e Pontuações CBT
        </div>
        <h2 style="font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;">
          Gestão de Categorias, Participantes e Confrontos
        </h2>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 0.95rem; margin-top: 0.25rem;">
          Defina as federações estaduais participantes, consulte as pontuações CBT oficiais e monte os confrontos selecionando os estados manualmente.
        </p>
      </div>

      <div>
        <button class="btn btn-secondary btn-lg" onclick="window.goToBracketWithCategory('${currentCat.id}')">
          ⚔️ Ver Confrontos desta Categoria
        </button>
      </div>
    </div>

    <!-- GRADE DE TODAS AS CATEGORIAS -->
    <div style="margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 800; color: #ffffff; text-shadow: 0 2px 6px rgba(0,0,0,0.6);">
          🎾 Categorias do Torneio (${categories.length} categorias)
        </h3>
        <span style="font-size: 0.8rem; color: #cbd5e1; font-weight: 600; text-shadow: 0 1px 4px rgba(0,0,0,0.4);">
          💡 Clique na categoria para selecioná-la e visualizar participantes e BYEs
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 0.75rem;">
        ${categories.map(cat => {
          const fedsCount = store.getCategoryParticipatingFeds(cat.id).length;
          const byesCount = Math.max(0, 32 - fedsCount);
          const isSelected = cat.id === currentCat.id;

          return `
            <div class="category-select-card ${isSelected ? 'selected' : ''}"
                 onclick="window.selectCategoryTab('${cat.id}')"
                 style="cursor: pointer; padding: 0.9rem 1rem; border-radius: var(--radius-md); border: 2px solid ${isSelected ? '#028090' : '#cbd5e1'}; background: ${isSelected ? 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)' : '#ffffff'}; box-shadow: ${isSelected ? '0 4px 14px rgba(2, 128, 144, 0.22)' : '0 2px 6px rgba(0,0,0,0.06)'}; transition: all var(--transition-fast); display: flex; flex-direction: column; justify-content: space-between; min-height: 105px; position: relative;">
              
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.4rem;">
                <span class="cat-title" style="font-weight: 800; font-size: 1rem; color: ${isSelected ? '#028090' : '#0f172a'};">
                  ${cat.nome}
                </span>
                ${isSelected ? `
                  <span style="background: #028090; color: #ffffff; font-size: 0.68rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em;">
                    Ativa
                  </span>
                ` : `
                  <span style="background: ${cat.ativa ? '#e0f2fe' : '#f1f5f9'}; color: ${cat.ativa ? '#0369a1' : '#64748b'}; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px;">
                    ${cat.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                `}
              </div>

              <div style="margin-top: 0.6rem; border-top: 1px dashed ${isSelected ? '#99f6e4' : '#cbd5e1'}; padding-top: 0.45rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
                  <span class="cat-feds-highlight" style="font-size: 0.85rem; font-weight: 800; color: #004b57; display: inline-flex; align-items: center; gap: 0.25rem;">
                    🏛️ <strong>${fedsCount} Estados</strong>
                  </span>
                  <span class="cat-byes-highlight ${byesCount > 0 ? 'has-byes' : 'no-byes'}" style="font-weight: 800; padding: 0.12rem 0.45rem; border-radius: 4px; font-size: 0.72rem; background: ${byesCount > 0 ? '#dcfce7' : '#f1f5f9'}; color: ${byesCount > 0 ? '#15803d' : '#475569'}; border: 1px solid ${byesCount > 0 ? '#86efac' : '#cbd5e1'};">
                    ${byesCount > 0 ? `⏩ ${byesCount} BYEs` : 'Sem BYEs'}
                  </span>
                </div>
                <div style="font-size: 0.72rem; color: #475569; font-weight: 600; margin-top: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${cat.formato}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- DETALHES DA CATEGORIA SELECIONADA -->
    <div class="card" style="margin-bottom: 1.5rem; border-left: 5px solid #028090; background: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1.45rem; font-weight: 800; color: #0b1a30; margin-bottom: 0.2rem;">
            Categoria: ${currentCat.nome}
          </h3>
          <p style="color: #475569; font-size: 0.88rem; font-weight: 600;">
            Formato de disputa: <strong style="color: #028090;">${currentCat.formato}</strong>
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; color: #0f172a; cursor: ${isAdmin ? 'pointer' : 'default'};">
            <input type="checkbox" ${currentCat.ativa ? 'checked' : ''} ${!isAdmin ? 'disabled' : ''} onchange="window.handleToggleCategoryActive('${currentCat.id}', this.checked)">
            Categoria Ativa no Torneio
          </label>
        </div>
      </div>

      <!-- CARDS DE MÉTRICAS E IMPACTO DE BYES COM CORES VIVAS E ALTO CONTRASTE -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
        <div style="background: #f8fafc; padding: 1.15rem; border-radius: var(--radius-md); border: 2px solid #028090; box-shadow: 0 2px 8px rgba(2, 128, 144, 0.12);">
          <div style="font-size: 0.8rem; text-transform: uppercase; font-weight: 800; color: #004b57; letter-spacing: 0.04em;">🏛️ Estados Participantes</div>
          <div id="stat-participants" style="font-size: 2.2rem; font-weight: 900; color: #091b2c; font-family: var(--font-display); line-height: 1.2; margin: 0.25rem 0;">
            ${totalPart} <span style="font-size: 1.15rem; color: #64748b; font-weight: 700;">/ 27</span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: #334155;">Federações estaduais inscritas nesta categoria</div>
        </div>

        <div style="background: #f0fdf4; padding: 1.15rem; border-radius: var(--radius-md); border: 2px solid #10b981; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.12);">
          <div style="font-size: 0.8rem; text-transform: uppercase; font-weight: 800; color: #047857; letter-spacing: 0.04em;">⏩ Vagas Livres (BYEs)</div>
          <div id="stat-byes" style="font-size: 2.2rem; font-weight: 900; color: #065f46; font-family: var(--font-display); line-height: 1.2; margin: 0.25rem 0;">
            ${numByes} <span style="font-size: 1.15rem; font-weight: 700;">BYEs</span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: #047857;">Avançam direto para as Oitavas de Final</div>
        </div>

        <div style="background: #eff6ff; padding: 1.15rem; border-radius: var(--radius-md); border: 2px solid #2563eb; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);">
          <div style="font-size: 0.8rem; text-transform: uppercase; font-weight: 800; color: #1d4ed8; letter-spacing: 0.04em;">⚔️ Confrontos 1ª Fase</div>
          <div id="stat-matches" style="font-size: 2.2rem; font-weight: 900; color: #1e40af; font-family: var(--font-display); line-height: 1.2; margin: 0.25rem 0;">
            ${realMatches} <span style="font-size: 1.15rem; font-weight: 700;">Jogos</span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: #1d4ed8;">${realMatches * 2} estados disputam a 1ª fase de mata-mata</div>
        </div>
      </div>

      <!-- EXPLICAÇÃO DA REGRA DO CHAVEAMENTO -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 0.85rem 1rem; font-size: 0.85rem; color: #92400e; display: flex; align-items: center; gap: 0.65rem;">
        <span style="font-size: 1.25rem;">💡</span>
        <span>
          <strong>Regra Oficial do Chaveamento:</strong> A chave possui 32 posições. 
          Para <strong>${totalPart} estados participantes</strong>, são ${realMatches} confrontos na 1ª fase e ${numByes} vagas de avanço para as Oitavas de Final. 
          As pontuações CBT dos estados estão calculadas abaixo como referência técnica, <strong>sem inserção automática de BYE</strong>, permitindo que a comissão técnica monte os confrontos selecionando os estados manualmente.
        </span>
      </div>
    </div>

    <!-- SEÇÃO: CÁLCULO DAS PONTUAÇÕES CBT DOS ESTADOS -->
    <div class="card" style="margin-bottom: 1.5rem; border: 2px solid #028090; background: #ffffff;">
      <div class="card-header" style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-bottom: 1px solid #99f6e4; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: #028090; color: white; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 800; text-transform: uppercase;">
            📊 Apuração Oficial CBT
          </div>
          <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: #004b57; margin-top: 0.35rem;">
            Cálculo dos Estados com Pontuações CBT — ${currentCat.nome}
          </h3>
          <p style="color: #0f766e; font-size: 0.85rem; margin-top: 0.2rem;">
            Pontuação oficial calculada pela soma dos rankings dos 2 melhores atletas femininos e 2 melhores masculinos de cada federação.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="window.openConfigureFirstRoundModal('${currentCat.id}')" style="font-weight: 700; font-size: 0.85rem; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.4rem; box-shadow: var(--shadow-sm);">
            ⚔️ Definir Confrontos Manualmente
          </button>
        </div>
      </div>

      <div style="padding: 1.25rem;">
        <!-- AVISO OFICIAL: NÃO INSERIDO COMO BYE -->
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: var(--radius-md); padding: 0.9rem 1.15rem; font-size: 0.85rem; color: #92400e; margin-bottom: 1.25rem; display: flex; align-items: flex-start; gap: 0.75rem;">
          <span style="font-size: 1.35rem; line-height: 1;">📌</span>
          <div>
            <strong style="color: #78350f;">Regra Oficial dos Confrontos:</strong>
            Os estados abaixo possuem as pontuações CBT calculadas oficialmente para consulta e referência técnica, 
            <strong>mas eles não são inseridos na categoria como BYE</strong>. É permitido colocar os confrontos selecionando os estados manualmente na 1ª Rodada.
          </div>
        </div>

        <!-- TABELA DE PONTUAÇÕES CBT -->
        <div style="overflow-x: auto;">
          <table class="table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 0.65rem 0.75rem; font-weight: 800; color: #004b57; width: 50px;">Pos</th>
                <th style="padding: 0.65rem 0.75rem; font-weight: 800; color: #004b57;">Estado / Federação</th>
                <th style="padding: 0.65rem 0.75rem; font-weight: 800; color: #004b57; text-align: center;">Pontuação CBT (Soma)</th>
                <th style="padding: 0.65rem 0.75rem; font-weight: 800; color: #004b57;">Top Atletas Femininos (2 Melhores)</th>
                <th style="padding: 0.65rem 0.75rem; font-weight: 800; color: #004b57;">Top Atletas Masculinos (2 Melhores)</th>
                <th style="padding: 0.65rem 0.75rem; font-weight: 800; color: #004b57; text-align: center;">Status Pré-requisitos</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const rankedList = store.calculateCategorySeeds(currentCat.id);
                const participatingRanked = rankedList.filter(item => participatingIds.has(item.id));
                return participatingRanked.map((item, idx) => {
                  const hasPoints = item.somaRankings !== null;
                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9; ${hasPoints ? 'background: #ffffff;' : 'background: #fafafa; opacity: 0.85;'}">
                      <td style="padding: 0.65rem 0.75rem; font-weight: 800; color: ${idx < 6 ? '#028090' : '#64748b'};">
                        ${idx + 1}º
                      </td>
                      <td style="padding: 0.65rem 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <img src="assets/federations/${item.id}.jpg" alt="${item.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${item.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${item.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 28px; height: 20px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.15); background: #ffffff; padding: 1px;">
                          <strong style="color: #0f172a;">${item.nome}</strong>
                          <span style="font-size: 0.75rem; color: #64748b; font-weight: 700;">(${item.uf})</span>
                        </div>
                      </td>
                      <td style="padding: 0.65rem 0.75rem; text-align: center;">
                        ${hasPoints ? `
                          <span style="background: #f0fdfa; border: 1.5px solid #99f6e4; color: #0f766e; font-weight: 800; font-size: 0.85rem; padding: 0.2rem 0.65rem; border-radius: 4px;">
                            ${item.somaRankings} pts
                          </span>
                        ` : `
                          <span style="color: #94a3b8; font-size: 0.78rem; font-weight: 600;">Sem soma válida</span>
                        `}
                      </td>
                      <td style="padding: 0.65rem 0.75rem; font-size: 0.8rem; color: #334155;">
                        ${item.fem1 ? `<span>1ª: ${item.fem1.nome} ${item.fem1.ranking ? `(#${item.fem1.ranking})` : ''}</span>` : '<span style="color:#94a3b8;">-</span>'}<br>
                        ${item.fem2 ? `<span>2ª: ${item.fem2.nome} ${item.fem2.ranking ? `(#${item.fem2.ranking})` : ''}</span>` : '<span style="color:#94a3b8;">-</span>'}
                      </td>
                      <td style="padding: 0.65rem 0.75rem; font-size: 0.8rem; color: #334155;">
                        ${item.masc1 ? `<span>1º: ${item.masc1.nome} ${item.masc1.ranking ? `(#${item.masc1.ranking})` : ''}</span>` : '<span style="color:#94a3b8;">-</span>'}<br>
                        ${item.masc2 ? `<span>2º: ${item.masc2.nome} ${item.masc2.ranking ? `(#${item.masc2.ranking})` : ''}</span>` : '<span style="color:#94a3b8;">-</span>'}
                      </td>
                      <td style="padding: 0.65rem 0.75rem; text-align: center;">
                        ${item.isComplete ? `
                          <span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">
                            ✅ Completo (2F + 2M)
                          </span>
                        ` : `
                          <span style="background: #f1f5f9; color: #64748b; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">
                            Incompleto (${item.femRankedCount}F, ${item.mascRankedCount}M)
                          </span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SELETOR DE ESTADOS PARTICIPANTES -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h3 class="card-title">🇧🇷 Selecionar Federações Estaduais Participantes</h3>
          <p class="card-subtitle">
            Marque os estados que competem nesta categoria. Ao alterar a quantidade de participantes, o número de casas de BYE acima é ajustado automaticamente.
          </p>
        </div>

        <!-- ATALHOS RÁPIDOS DE SELEÇÃO -->
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('all')">
            ✓ Todos os 27 Estados (5 BYEs)
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('26')">
            Simular 26 Estados (6 BYEs)
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('25')">
            Simular 25 Estados (7 BYEs)
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('none')">
            Desmarcar Todos
          </button>
        </div>
      </div>

      <!-- GRADE DE 27 FEDERAÇÕES -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
        ${allFeds.map(fed => {
          const isChecked = participatingIds.has(fed.id);

          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border: 2px solid ${isChecked ? 'var(--primary-light)' : 'var(--border-light)'}; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s ease; background: ${isChecked ? '#f8fafc' : '#ffffff'};"
                 onclick="const cb = this.querySelector('input[type=checkbox]'); if (cb) { cb.checked = !cb.checked; window.handleToggleCategoryParticipant('${fed.id}', cb.checked); }">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" onerror="if (!this.dataset.triedPng) { this.dataset.triedPng = '1'; this.src='assets/federations/${fed.id}.png'; } else if (!this.dataset.triedSvg) { this.dataset.triedSvg = '1'; this.src='assets/federations/${fed.id}.svg'; } else { this.onerror=null; this.src='assets/logo.jpg'; }" style="width: 36px; height: 26px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.2); background: #ffffff; padding: 1px; flex-shrink: 0;">
                <div>
                  <strong style="color: var(--accent-dark-blue); font-size: 0.9rem;">
                    ${fed.nome} (${fed.uf})
                  </strong>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">
                    ${isChecked ? 'Participante inscrito' : 'Não inscrito'}
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <input type="checkbox" 
                       class="cat-fed-checkbox" 
                       value="${fed.id}" 
                       ${isChecked ? 'checked' : ''} 
                       onchange="window.handleToggleCategoryParticipant('${fed.id}', this.checked)"
                       onclick="event.stopPropagation()"
                       style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- BOTÃO SALVAR SELEÇÃO -->
      <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-light); display: flex; align-items: center; justify-content: flex-end; gap: 1rem;">
        <button class="btn btn-primary btn-lg" onclick="window.handleSaveCategoryParticipants()">
          💾 Salvar Participantes e Atualizar Chaveamento
        </button>
      </div>
    </div>
  `;
}
