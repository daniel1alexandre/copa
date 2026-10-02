// Módulo Menu Categoria: Gestão de Categorias e Estados Participantes
import { store } from '../data/store.js';
import { toast } from './toast.js';

let selectedCategoryId = 'prof';

export function initCategoryView() {
  window.selectCategoryTab = (catId) => {
    selectedCategoryId = catId;
    renderCategoryView();
  };

  // Alteração individual de slot de BYE por ranking (1º, 2º, 3º...)
  window.handleByeSlotSelectChange = (slotIndex, fedId) => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem alterar os BYEs.', type: 'error' });
      return;
    }

    const participatingFeds = store.getCategoryParticipatingFeds(selectedCategoryId);
    const numByes = Math.max(0, 32 - participatingFeds.length);
    const validPartIds = participatingFeds.map(f => f.id);

    let byes = [...store.getCategoryByes(selectedCategoryId)];
    while (byes.length < numByes) byes.push(null);
    byes = byes.slice(0, numByes);

    if (fedId) {
      if (!validPartIds.includes(fedId)) {
        alert('O estado selecionado precisa estar na lista de participantes desta categoria.');
        return;
      }
      // Se já estava em outro slot, faz swap com o slot atual
      const existingIndex = byes.indexOf(fedId);
      if (existingIndex !== -1 && existingIndex !== slotIndex) {
        byes[existingIndex] = byes[slotIndex] || null;
      }
      byes[slotIndex] = fedId;
    } else {
      byes[slotIndex] = null;
    }

    // Filtra nulos e salva
    const cleanByes = byes.filter(id => id && validPartIds.includes(id));
    store.setCategoryByes(selectedCategoryId, cleanByes);
    renderCategoryView();
  };

  // Preenchimento automático com base nos melhores rankings/seeds
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

    const sorted = [...feds].sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      if (a.seed) return -1;
      if (b.seed) return 1;
      return a.nome.localeCompare(b.nome);
    });

    const autoByes = sorted.slice(0, numByes).map(f => f.id);
    store.setCategoryByes(selectedCategoryId, autoByes);
    toast.show({
      title: 'BYEs Preenchidos!',
      message: `${autoByes.length} vagas de BYE preenchidas por ordem de Ranking/Seed.`,
      type: 'success'
    });
    renderCategoryView();
  };

  // Limpar todas as vagas de BYE da categoria
  window.handleClearAllByes = () => {
    if (!window.auth || typeof window.auth.isAdmin !== 'function' || !window.auth.isAdmin()) {
      toast.show({ title: 'Acesso Restrito', message: 'Apenas administradores podem limpar BYEs.', type: 'error' });
      return;
    }

    store.setCategoryByes(selectedCategoryId, []);
    toast.show({
      title: 'BYEs Limpos',
      message: 'Todas as vagas de BYE desta categoria foram desmarcadas.',
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

  const categories = store.getCategories();
  const currentCat = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const allFeds = [...store.getFederations()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const participatingFeds = store.getCategoryParticipatingFeds(currentCat.id);
  const participatingIds = new Set(participatingFeds.map(f => f.id));
  const totalPart = participatingFeds.length;
  const numByes = Math.max(0, 32 - totalPart);
  const realMatches = Math.max(0, totalPart - 16);
  const byesList = store.getCategoryByes(currentCat.id);
  const isAdmin = Boolean(window.auth && typeof window.auth.isAdmin === 'function' && window.auth.isAdmin());

  container.innerHTML = `
    <!-- HEADER DA GESTÃO DE CATEGORIAS -->
    <div style="background: linear-gradient(135deg, #091b2c 0%, #004b57 60%, #028090 100%); border-radius: var(--radius-lg); padding: 1.5rem; color: white; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-md);">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 183, 3, 0.2); color: #ffb703; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
          🎾 Configuração de Estados e BYEs por Ranking
        </div>
        <h2 style="font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;">
          Gestão de Categorias, Participantes e BYEs
        </h2>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 0.95rem; margin-top: 0.25rem;">
          Defina as federações estaduais participantes e preencha as casas de BYE com seus respectivos rankings (1º, 2º, 3º...) para definir quem avança direto às Oitavas.
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
            <div class="category-select-card"
                 onclick="window.selectCategoryTab('${cat.id}')"
                 style="cursor: pointer; padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}; background: ${isSelected ? 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)' : '#ffffff'}; box-shadow: ${isSelected ? '0 4px 14px rgba(2, 128, 144, 0.18)' : 'var(--shadow-sm)'}; transition: all var(--transition-fast); display: flex; flex-direction: column; justify-content: space-between; min-height: 95px; position: relative;">
              
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.4rem;">
                <span style="font-weight: 800; font-size: 0.95rem; color: ${isSelected ? 'var(--primary)' : 'var(--accent-dark-blue)'};">
                  ${cat.nome}
                </span>
                ${isSelected ? `
                  <span style="background: var(--primary); color: white; font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: var(--radius-xs); text-transform: uppercase;">
                    Selecionada
                  </span>
                ` : `
                  <span style="background: var(--bg-subtle); color: var(--text-muted); font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: var(--radius-xs);">
                    ${cat.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                `}
              </div>

              <div style="margin-top: 0.5rem; border-top: 1px dashed ${isSelected ? '#99f6e4' : 'var(--border-light)'}; padding-top: 0.4rem;">
                <div style="font-size: 0.78rem; font-weight: 700; color: ${byesCount > 0 ? '#047857' : 'var(--accent-dark-blue)'}; display: flex; align-items: center; justify-content: space-between;">
                  <span>🇧🇷 ${fedsCount} Estados</span>
                  <span style="background: ${byesCount > 0 ? '#ecfdf5' : '#f1f5f9'}; color: ${byesCount > 0 ? '#065f46' : 'var(--text-muted)'}; padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); font-size: 0.72rem;">
                    ${byesCount} BYEs
                  </span>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${cat.formato}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- DETALHES DA CATEGORIA SELECIONADA -->
    <div class="card" style="margin-bottom: 1.5rem; border-left: 5px solid var(--primary);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; color: var(--accent-dark-blue);">
            Categoria: ${currentCat.nome}
          </h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
            Formato: <strong>${currentCat.formato}</strong>
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; cursor: ${isAdmin ? 'pointer' : 'default'};">
            <input type="checkbox" ${currentCat.ativa ? 'checked' : ''} ${!isAdmin ? 'disabled' : ''} onchange="window.handleToggleCategoryActive('${currentCat.id}', this.checked)">
            Categoria Ativa no Torneio
          </label>
        </div>
      </div>

      <!-- CARDS DE MÉTRICAS E IMPACTO DE BYES -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Estados Participantes</div>
          <div id="stat-participants" style="font-size: 1.8rem; font-weight: 800; color: var(--accent-dark-blue); font-family: var(--font-display);">
            ${totalPart} / 27
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Federações estaduais inscritas</div>
        </div>

        <div style="background: #ecfdf5; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #a7f3d0;">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #047857;">Vagas Livres (BYEs)</div>
          <div id="stat-byes" style="font-size: 1.8rem; font-weight: 800; color: #065f46; font-family: var(--font-display);">
            ${numByes} BYEs
          </div>
          <div style="font-size: 0.75rem; color: #047857;">Avançam direto para as Oitavas</div>
        </div>

        <div style="background: #eff6ff; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #bfdbfe;">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #1d4ed8;">Confrontos 1ª Fase</div>
          <div id="stat-matches" style="font-size: 1.8rem; font-weight: 800; color: #1e40af; font-family: var(--font-display);">
            ${realMatches} Jogos
          </div>
          <div style="font-size: 0.75rem; color: #1d4ed8;">${realMatches * 2} estados disputando a 1ª fase</div>
        </div>
      </div>

      <!-- EXPLICAÇÃO DA REGRA DE BYE -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 0.85rem 1rem; font-size: 0.85rem; color: #92400e; display: flex; align-items: center; gap: 0.65rem;">
        <span style="font-size: 1.25rem;">💡</span>
        <span>
          <strong>Regra Oficial do Chaveamento:</strong> A chave possui 32 posições. 
          Para <strong>${totalPart} estados participantes</strong>, são geradas exatamente <strong>${numByes} vagas de BYE</strong>. 
          Preencha abaixo os estados correspondentes aos rankings (1º, 2º, 3º...) para alocá-los nas posições de BYE.
        </span>
      </div>
    </div>

    <!-- SEÇÃO DE CASAS PARA PREENCHER OS ESTADOS DE BYE POR RANKING -->
    <div class="card" style="margin-bottom: 1.5rem; border: 2px solid #028090; background: #ffffff;">
      <div class="card-header" style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); border-bottom: 1px solid #99f6e4; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: #028090; color: white; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 800; text-transform: uppercase;">
            ⏩ Alocação de BYEs por Ranking
          </div>
          <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; color: #004b57; margin-top: 0.35rem;">
            🏆 Casas para Preenchimento dos Estados de BYE (${numByes} vagas na categoria ${currentCat.nome})
          </h3>
          <p style="color: #0f766e; font-size: 0.85rem; margin-top: 0.2rem;">
            Conforme os <strong>${totalPart} estados</strong> desta categoria, preencha as <strong>${numByes} casas</strong> abaixo com o estado de cada ranking (1º, 2º, 3º...).
          </p>
        </div>

        ${isAdmin ? `
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-sm" onclick="window.handleAutoFillSeeds()" style="background: #028090; color: white; border: none; font-weight: 700; font-size: 0.8rem; padding: 0.45rem 0.85rem; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; gap: 0.35rem; box-shadow: var(--shadow-sm);">
              ⚡ Preencher por Ranking (Seeds)
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.handleClearAllByes()" style="font-size: 0.8rem; font-weight: 700; padding: 0.45rem 0.85rem;">
              🗑️ Limpar Todos os BYEs
            </button>
          </div>
        ` : ''}
      </div>

      <div style="padding: 1.25rem;">
        ${numByes > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 1rem;">
            ${Array.from({ length: numByes }).map((_, idx) => {
              const rankNum = idx + 1;
              const rankLabel = `${rankNum}º`;
              const selectedFedId = byesList[idx] || '';
              const selectedFed = participatingFeds.find(f => f.id === selectedFedId);

              return `
                <div class="bye-slot-card" style="border: 2px solid ${selectedFed ? '#0d9488' : '#cbd5e1'}; background: ${selectedFed ? '#f0fdfa' : '#f8fafc'}; border-radius: var(--radius-md); padding: 0.85rem 1rem; box-shadow: var(--shadow-sm); transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between;">
                  
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem;">
                      <span style="background: ${selectedFed ? '#0f766e' : '#475569'}; color: white; font-weight: 800; font-size: 0.85rem; padding: 0.2rem 0.65rem; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 0.35rem;">
                        🎖️ ${rankLabel} Ranking ${rankNum <= 4 ? `(Cabeça ${rankNum})` : ''}
                      </span>
                      <span style="font-size: 0.72rem; font-weight: 800; color: ${selectedFed ? '#047857' : '#94a3b8'}; background: ${selectedFed ? '#ecfdf5' : '#f1f5f9'}; padding: 0.15rem 0.45rem; border-radius: var(--radius-xs);">
                        ${selectedFed ? '✅ Vaga Definida' : '⚪ Vaga Aberta'}
                      </span>
                    </div>

                    <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--accent-dark-blue); margin-bottom: 0.35rem;">
                      Estado do <strong>${rankLabel} Ranking</strong> (Passa de BYE):
                    </label>

                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <select class="form-select" 
                              style="width: 100%; font-size: 0.88rem; font-weight: 700; border: 1.5px solid ${selectedFed ? '#0d9488' : '#cbd5e1'}; background-color: ${!isAdmin ? '#f8fafc' : '#ffffff'}; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); ${!isAdmin ? 'cursor: not-allowed;' : ''}"
                              ${!isAdmin ? 'disabled' : ''}
                              onchange="window.handleByeSlotSelectChange(${idx}, this.value)">
                        <option value="">-- Selecione o ${rankLabel} Estado --</option>
                        ${participatingFeds.map(f => {
                          const otherIdx = byesList.indexOf(f.id);
                          const isCurrent = f.id === selectedFedId;
                          const alreadyInOther = otherIdx !== -1 && otherIdx !== idx;
                          const tag = alreadyInOther ? ` (no ${otherIdx + 1}º Ranking)` : '';
                          return `<option value="${f.id}" ${isCurrent ? 'selected' : ''}>${f.nome} (${f.uf})${tag}</option>`;
                        }).join('')}
                      </select>

                      ${isAdmin && selectedFed ? `
                        <button title="Limpar ${rankLabel} Ranking" 
                                onclick="window.handleByeSlotSelectChange(${idx}, '')"
                                style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; width: 34px; height: 34px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;"
                                onmouseover="this.style.background='#fecaca'"
                                onmouseout="this.style.background='#fee2e2'">
                          ✕
                        </button>
                      ` : ''}
                    </div>
                  </div>

                  <div style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed ${selectedFed ? '#99f6e4' : '#e2e8f0'}; min-height: 28px; display: flex; align-items: center;">
                    ${selectedFed ? `
                      <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                        <img src="assets/federations/${selectedFed.id}.jpg" alt="${selectedFed.uf}" style="width: 26px; height: 18px; border-radius: 2px; object-fit: contain; box-shadow: 0 1px 2px rgba(0,0,0,0.15);">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #0f766e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${selectedFed.nome} (${selectedFed.uf})
                        </span>
                      </div>
                    ` : `
                      <span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">
                        Nenhum estado selecionado para esta vaga.
                      </span>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.95rem;">
            🎉 Esta categoria possui 32 participantes completos, portanto não há vagas de BYE necessárias.
          </div>
        `}
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
          const isBye = byesList.includes(fed.id);
          const byeRank = byesList.indexOf(fed.id) + 1;

          return `
            <div onclick="window.handleToggleCategoryBye('${fed.id}', event)"
                 style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border: 2px solid ${isBye ? '#10b981' : (isChecked ? 'var(--primary-light)' : 'var(--border-light)')}; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s ease; background: ${isBye ? '#ecfdf5' : (isChecked ? '#f8fafc' : '#ffffff')};">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" style="width: 28px; height: 20px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                <div>
                  <strong style="color: ${isBye ? '#065f46' : 'var(--accent-dark-blue)'}; font-size: 0.9rem;">
                    ${fed.nome} (${fed.uf})
                  </strong>
                  ${isBye ? `
                    <div style="font-size: 0.75rem; color: #047857; font-weight: 800;">
                      ⏩ BYE: ${byeRank}º Ranking
                    </div>
                  ` : `
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                      ${isChecked ? 'Participante regular' : 'Não participante'}
                    </div>
                  `}
                </div>
              </div>

              <input type="checkbox" 
                     class="cat-fed-checkbox" 
                     value="${fed.id}" 
                     ${isChecked ? 'checked' : ''} 
                     onchange="window.handleToggleCategoryParticipant('${fed.id}', this.checked)"
                     onclick="event.stopPropagation()"
                     style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
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
