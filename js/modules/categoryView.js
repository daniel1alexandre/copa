// Módulo Menu Categoria: Gestão de Categorias e Estados Participantes
import { store } from '../data/store.js';
import { toast } from './toast.js';

let selectedCategoryId = 'prof';

export function initCategoryView() {
  window.selectCategoryTab = (catId) => {
    selectedCategoryId = catId;
    renderCategoryView();
  };

  window.handleToggleCategoryBye = (fedId, event) => {
    // Previne comportamento padrão caso clique venha de outro elemento, mas aqui será um onclick no div
    if (event) {
      if (event.target.tagName.toLowerCase() === 'input') return; // Se clicou no checkbox, ignora
    }

    // Auto-salva os participantes selecionados para não perder rascunho
    const checkboxes = document.querySelectorAll('.cat-fed-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    if (!selectedIds.includes(fedId)) {
      alert('O estado precisa estar selecionado como participante para receber o BYE.');
      return;
    }
    store.setCategoryParticipatingFeds(selectedCategoryId, selectedIds);

    const feds = store.getCategoryParticipatingFeds(selectedCategoryId);
    const numByes = Math.max(0, 32 - feds.length);
    const byes = [...store.getCategoryByes(selectedCategoryId)];
    const isCurrentlyBye = byes.includes(fedId);
    
    if (!isCurrentlyBye) {
      if (byes.length >= numByes) {
        alert(`Você só pode escolher até ${numByes} estados para passar de BYE nesta categoria.`);
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
    store.toggleCategory(catId, checked);
    toast.show({
      title: 'Categoria Atualizada',
      message: `Categoria ${checked ? 'ativada' : 'desativada'}.`,
      type: 'info'
    });
    renderCategoryView();
  };

  window.handleQuickSelectParticipants = (preset) => {
    const feds = store.getFederations();
    let selectedIds = [];

    if (preset === 'all') {
      selectedIds = feds.map(f => f.id);
    } else if (preset === '26') {
      // 26 estados (ex: todos exceto AC)
      selectedIds = feds.filter(f => f.uf !== 'AC').map(f => f.id);
    } else if (preset === '25') {
      // 25 estados (ex: todos exceto AC e RR)
      selectedIds = feds.filter(f => !['AC', 'RR'].includes(f.uf)).map(f => f.id);
    } else if (preset === 'none') {
      selectedIds = [];
    }

    const checkboxes = document.querySelectorAll('.cat-fed-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = selectedIds.includes(cb.value);
    });

    updateParticipationPreview();
  };

  window.handleSaveCategoryParticipants = () => {
    const checkboxes = document.querySelectorAll('.cat-fed-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length < 2) {
      alert('Selecione pelo menos 2 estados participantes para gerar a chave da categoria.');
      return;
    }

    store.setCategoryParticipatingFeds(selectedCategoryId, selectedIds);

    const numByes = Math.max(0, 32 - selectedIds.length);
    toast.show({
      title: 'Participantes Atualizados!',
      message: `Categoria ${store.getCategories().find(c=>c.id===selectedCategoryId)?.nome}: ${selectedIds.length} estados participantes e ${numByes} BYEs gerados com sucesso!`,
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
  const allFeds = [...store.getFederations()].sort((a, b) => a.nome.localeCompare(b.nome));
  const participatingFeds = store.getCategoryParticipatingFeds(currentCat.id);
  const participatingIds = new Set(participatingFeds.map(f => f.id));

  const totalPart = participatingFeds.length;
  const numByes = Math.max(0, 32 - totalPart);
  const realMatches = Math.max(0, totalPart - 16);

  container.innerHTML = `
    <!-- HEADER DA GESTÃO DE CATEGORIAS -->
    <div style="background: linear-gradient(135deg, #091b2c 0%, #004b57 60%, #028090 100%); border-radius: var(--radius-lg); padding: 1.5rem; color: white; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-md);">
      <div>
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255, 183, 3, 0.2); color: #ffb703; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
          🎾 Configuração de Estados por Categoria
        </div>
        <h2 style="font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;">
          Gestão de Categorias e Participantes
        </h2>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 0.95rem; margin-top: 0.25rem;">
          Defina quais federações estaduais participam de cada categoria. O sistema calcula e ajusta automaticamente o número de BYEs e confrontos da 1ª fase.
        </p>
      </div>

      <div>
        <button class="btn btn-secondary btn-lg" onclick="window.goToBracketWithCategory('${currentCat.id}')">
          ⚔️ Ver Confrontos desta Categoria
        </button>
      </div>
    </div>

    <!-- GRADE DE TODAS AS CATEGORIAS (TODAS VISÍVEIS) -->
    <div style="margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 800; color: var(--accent-dark-blue);">
          🎾 Categorias do Torneio (${categories.length} categorias — todas visíveis)
        </h3>
        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
          💡 Clique no card de qualquer categoria para visualizar e configurar
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
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; cursor: pointer;">
            <input type="checkbox" ${currentCat.ativa ? 'checked' : ''} onchange="window.handleToggleCategoryActive('${currentCat.id}', this.checked)">
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
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 0.85rem 1rem; font-size: 0.85rem; color: #92400e; display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.25rem;">
        <span style="font-size: 1.25rem;">💡</span>
        <span>
          <strong>Regra Oficial do Chaveamento:</strong> A chave possui 32 vagas. 
          Quando participam <strong>27 estados</strong>, há <strong>5 BYEs</strong>. 
          Se participarem <strong>26 estados</strong>, haverá <strong>6 BYEs</strong>. 
          Se participarem <strong>25 estados</strong>, haverá <strong>7 BYEs</strong>.
        </span>
      </div>
    </div>

    <!-- SELETOR DE ESTADOS PARTICIPANTES -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h3 class="card-title">🇧🇷 Selecionar Federações Estaduais Participantes e BYEs</h3>
          <p class="card-subtitle">
            • <strong>Participação:</strong> Marque a caixinha à direita para incluir o estado.<br>
            • <strong>BYE:</strong> Após marcado como participante, clique em cima do card do estado para defini-lo como BYE (Avanço Direto).
          </p>
        </div>

        <!-- ATALHOS RÁPIDOS DE SELEÇÃO -->
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('all')">
            ✓ Todos os 27 Estados
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('26')">
            Simular 26 Estados (sem AC)
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.handleQuickSelectParticipants('25')">
            Simular 25 Estados (sem AC e RR)
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
          const byesList = store.getCategoryByes(currentCat.id);
          const isBye = byesList.includes(fed.id);
          const byeRank = byesList.indexOf(fed.id) + 1;
          return `
            <div onclick="window.handleToggleCategoryBye('${fed.id}', event)"
                 style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border: 2px solid ${isBye ? '#10b981' : 'var(--border-light)'}; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s ease; background: ${isBye ? '#ecfdf5' : (isChecked ? '#f8fafc' : '#ffffff')};">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="assets/federations/${fed.id}.jpg" alt="${fed.uf}" style="width: 28px; height: 20px; border-radius: 3px; object-fit: contain; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                <div>
                  <strong style="color: ${isBye ? '#065f46' : 'var(--accent-dark-blue)'}; font-size: 0.9rem;">
                    ${fed.nome} (${fed.uf}) ${isBye ? ` ⏩ BYE [#${byeRank}]` : ''}
                  </strong>
                  <div style="font-size: 0.75rem; color: ${isBye ? '#047857' : 'var(--text-muted)'};">Estado: ${fed.uf}</div>
                </div>
              </div>

              <input type="checkbox" 
                     class="cat-fed-checkbox" 
                     value="${fed.id}" 
                     ${isChecked ? 'checked' : ''} 
                     onchange="updateParticipationPreview()"
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

function updateParticipationPreview() {
  const checkboxes = document.querySelectorAll('.cat-fed-checkbox:checked');
  const total = checkboxes.length;
  const numByes = Math.max(0, 32 - total);
  const realMatches = Math.max(0, total - 16);

  const statP = document.getElementById('stat-participants');
  const statB = document.getElementById('stat-byes');
  const statM = document.getElementById('stat-matches');

  if (statP) statP.textContent = `${total} / 27`;
  if (statB) statB.textContent = `${numByes} BYEs`;
  if (statM) statM.textContent = `${realMatches} Jogos`;
}
