// Armazenamento central com persistência em localStorage e reatividade
import { INITIAL_FEDERATIONS, INITIAL_ATHLETES, CBT_OFFICIAL_ATHLETES_VERSION, getAthleteGender } from './federations.js';
import { INITIAL_CATEGORIES, DEFAULT_POINTS_TABLE, INITIAL_COURTS, INITIAL_TOURNAMENT } from './categories.js';
import { createGraphBracket, propagateMatchResult, revertMatchResult, updateFirstRoundMatch, propagateAllByes } from '../modules/bracketEngine.js';

const STORAGE_KEY = 'copa_federacoes_2026_db_v1';

class AppStore {
  constructor() {
    this.listeners = [];
    this.undoStack = [];
    this.broadcastChannel = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('copa_federacoes_realtime_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.state) {
            console.log('[Broadcast] Atualização recebida do administrador:', event.data.summary);
            this.loadFromRemote(event.data.state, true, event.data.summary);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel não suportado:', err);
      }
    }

    this.state = this.loadState();
  }

  loadState() {
    try {
      if (typeof localStorage === 'undefined') {
        return this.createInitialSeed();
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.federations && parsed.brackets) {
          // Garante que confrontos com BYE não tenham resultados de placar
          Object.values(parsed.brackets).forEach(gamesList => {
            if (Array.isArray(gamesList)) {
              gamesList.forEach(g => {
                if (g.is_bye) {
                  g.placar_jogo1 = '';
                  g.resultado_jogo1 = null;
                  g.placar_jogo2 = '';
                  g.resultado_jogo2 = null;
                  g.placar_jogo3 = '';
                  g.resultado_jogo3 = null;
                  g.vitorias_a = 0;
                  g.vitorias_b = 0;
                  if (!g.vencedor_id) {
                    g.vencedor_id = g.lado_a?.id || g.lado_b?.id || null;
                  }
                  g.status = g.vencedor_id ? 'encerrado' : 'aguardando';
                }
              });
              // Para categorias com 27 estados (5 BYEs na 1ª fase: C1, C5, C9, C12, C16)
              const c1To16 = gamesList.filter(g => g.code && /^C([1-9]|1[0-6])$/.test(g.code));
              const numByes = c1To16.filter(g => g.is_bye).length;
              if (numByes === 5) {
                // Atualiza o cruzamento de C5 e C7 para R17_3 e R17_4 nos brackets salvos
                const c5 = gamesList.find(g => g.code === 'C5');
                const c7 = gamesList.find(g => g.code === 'C7');
                if (c5 && c5.proxima_fase_perdedor === 'R17_3') {
                  c5.proxima_fase_perdedor = 'R17_4';
                  c5.proxima_fase_perdedor_slot = 'A';
                }
                if (c7 && c7.proxima_fase_perdedor === 'R17_4') {
                  c7.proxima_fase_perdedor = 'R17_3';
                  c7.proxima_fase_perdedor_slot = 'A';
                }

                const r17_4 = gamesList.find(g => g.code === 'R17_4');
                if (r17_4) {
                  r17_4.bye_slot = 'A';
                  if (!r17_4.resultado_jogo1 && (!r17_4.vencedor_id || r17_4.is_bye)) {
                    r17_4.lado_a = null;
                  }
                }

                const r17_3 = gamesList.find(g => g.code === 'R17_3');
                if (r17_3 && !r17_3.resultado_jogo1) {
                  if (r17_3.is_bye && r17_3.bye_slot === 'A') {
                    r17_3.is_bye = false;
                    r17_3.bye_slot = null;
                    r17_3.status = 'aguardando';
                    r17_3.vencedor_id = null;
                    r17_3.lado_a = null;
                  }
                }

                // Configurações do bloco 25º-27º para categorias com 27 estados
                const r25_q1 = gamesList.find(g => g.code === 'R25_Q1');
                if (r25_q1) {
                  r25_q1.bye_slot = 'A';
                  r25_q1.proxima_fase = 'R25_SEMI_1';
                  r25_q1.proxima_fase_slot = 'A';
                  if (!r25_q1.resultado_jogo1 && (!r25_q1.vencedor_id || r25_q1.is_bye)) {
                    r25_q1.lado_a = null;
                  }
                }

                const r25_q2 = gamesList.find(g => g.code === 'R25_Q2');
                if (r25_q2) {
                  r25_q2.bye_slot = 'B';
                  r25_q2.proxima_fase = 'R25_SEMI_1';
                  r25_q2.proxima_fase_slot = 'B';
                  if (!r25_q2.resultado_jogo1 && (!r25_q2.vencedor_id || r25_q2.is_bye)) {
                    r25_q2.lado_b = null;
                  }
                }

                const r25_q3 = gamesList.find(g => g.code === 'R25_Q3');
                if (r25_q3) {
                  r25_q3.is_bye = true;
                  r25_q3.status = 'encerrado';
                  r25_q3.vencedor_id = null;
                  r25_q3.lado_a = null;
                  r25_q3.lado_b = null;
                }

                const r25_q4 = gamesList.find(g => g.code === 'R25_Q4');
                if (r25_q4) {
                  r25_q4.bye_slot = 'B';
                  r25_q4.proxima_fase = 'R25_SEMI_2';
                  r25_q4.proxima_fase_slot = 'B';
                  if (!r25_q4.resultado_jogo1 && (!r25_q4.vencedor_id || r25_q4.is_bye)) {
                    r25_q4.lado_b = null;
                  }
                }

                const r25_s1 = gamesList.find(g => g.code === 'R25_SEMI_1');
                if (r25_s1) {
                  r25_s1.proxima_fase = 'R25_FINAL';
                  r25_s1.proxima_fase_slot = 'A';
                }

                const r25_s2 = gamesList.find(g => g.code === 'R25_SEMI_2');
                if (r25_s2) {
                  r25_s2.bye_slot = 'A';
                  r25_s2.proxima_fase = 'R25_FINAL';
                  r25_s2.proxima_fase_slot = 'B';
                  if (!r25_s2.resultado_jogo1 && (!r25_s2.vencedor_id || r25_s2.is_bye)) {
                    r25_s2.lado_a = null;
                  }
                }
              }

              // Garante que jogos de 25º a 27º fiquem na chave reversa_25_27 e 17º a 24º em reversa_17_24
              gamesList.forEach(g => {
                if (g.code && g.code.startsWith('R25_')) {
                  g.bracket = 'reversa_25_27';
                  if (g.code.startsWith('R25_Q')) g.fase = 'Quartas de Final (25º-27º)';
                  else if (g.code.startsWith('R25_SEMI')) g.fase = 'Semifinais (25º-27º)';
                  else if (g.code === 'R25_FINAL') g.fase = 'Final (25º e 26º Lugar)';
                } else if (g.bracket === 'reversa_17_27') {
                  g.bracket = 'reversa_17_24';
                  if (g.code && g.code.startsWith('R17_') && !g.code.includes('_Q') && !g.code.includes('_SEMI') && !g.code.includes('_FINAL') && !g.code.includes('_19')) {
                    g.fase = '1ª Rodada (17º-24º)';
                  } else if (g.code && g.code.startsWith('R17_Q')) {
                    g.fase = 'Quartas de Final (17º-24º)';
                  } else if (g.code && (g.code.includes('_SEMI'))) {
                    g.fase = 'Semifinais (17º-24º)';
                  } else if (g.code && (g.code.includes('_FINAL') || g.code.includes('_19LUGAR') || g.code.includes('_23LUGAR'))) {
                    g.fase = 'Finais (17º ao 24º)';
                  }
                }
              });

              // Propaga automaticamente confrontos com Vaga Livre (BYE) para a próxima fase
              propagateAllByes(gamesList);
            }
          });

          // Garante que todas as federações tenham a propriedade imagem
          if (Array.isArray(parsed.federations)) {
            parsed.federations.forEach(f => {
              if (!f.imagem || f.imagem.endsWith('.svg')) {
                f.imagem = `assets/federations/${f.id}.jpg`;
              }
            });
          }

          // Remove categoria master30 caso ainda esteja no storage
          if (Array.isArray(parsed.categories)) {
            parsed.categories = parsed.categories.filter(c => c.id !== 'master30');
            parsed.categories.forEach(c => {
              const init = INITIAL_CATEGORIES.find(ic => ic.id === c.id);
              if (init) c.formato = init.formato;
            });
          }
          if (parsed.brackets && parsed.brackets['master30']) {
            delete parsed.brackets['master30'];
          }
          if (parsed.categoryParticipants && parsed.categoryParticipants['master30']) {
            delete parsed.categoryParticipants['master30'];
          }

          // Migração: se os brackets existirem mas estiverem no modelo antigo (< 75 jogos), regera para garantir a chave reversa completa e correta
          if (parsed.brackets) {
            Object.keys(parsed.brackets).forEach(catId => {
              const catByes = (parsed.categoryByes && parsed.categoryByes[catId]) || [];
              if (parsed.brackets[catId] && parsed.brackets[catId].length < 75) {
                const feds = (parsed.categoryParticipants && parsed.categoryParticipants[catId])
                  ? parsed.categoryParticipants[catId].map(id => INITIAL_FEDERATIONS.find(f => f.id === id)).filter(Boolean)
                  : INITIAL_FEDERATIONS;
                parsed.brackets[catId] = createGraphBracket(feds, catId, catByes);
              } else if (catByes.length === 0 && parsed.brackets[catId]) {
                // Regra: quando não tiver nenhum estado selecionado como Bye na categoria,
                // nos confrontos também não pode ter nenhum estado selecionado na primeira fase
                const hasR32Team = parsed.brackets[catId].some(
                  g => g.fase === '1ª Fase' && (g.lado_a || g.lado_b)
                );
                if (hasR32Team) {
                  const feds = (parsed.categoryParticipants && parsed.categoryParticipants[catId])
                    ? parsed.categoryParticipants[catId].map(id => INITIAL_FEDERATIONS.find(f => f.id === id)).filter(Boolean)
                    : INITIAL_FEDERATIONS;
                  parsed.brackets[catId] = createGraphBracket(feds, catId, []);
                }
              }
            });
          }
          // Garante que pointsTable sempre contenha todos os 27 lugares com os valores padrão oficiais CBT
          parsed.pointsTable = { ...DEFAULT_POINTS_TABLE, ...(parsed.pointsTable || {}) };

          // Garante que atletas sempre contenham a base completa do Tênis Integrado oficial CBT com gêneros corretos
          if (!Array.isArray(parsed.athletes) || parsed.athletes.length < 2000 || parsed._athletes_version !== CBT_OFFICIAL_ATHLETES_VERSION) {
            parsed.athletes = JSON.parse(JSON.stringify(INITIAL_ATHLETES));
            parsed._athletes_version = CBT_OFFICIAL_ATHLETES_VERSION;
          } else {
            parsed.athletes.forEach(a => {
              a.genero = getAthleteGender(a);
            });
          }

          if (parsed.tournament) {
            if (!parsed.tournament.horaInicio) parsed.tournament.horaInicio = '08:00';
            if (!parsed.tournament.dataInicio) parsed.tournament.dataInicio = '2026-10-15';
          }

          if (!parsed.categoryDrawnSeeds) {
            parsed.categoryDrawnSeeds = {};
          }

          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage, usando valores padrão:', e);
    }
    return this.createInitialSeed();
  }

  createInitialSeed() {
    const federations = JSON.parse(JSON.stringify(INITIAL_FEDERATIONS));
    const categories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    const courts = JSON.parse(JSON.stringify(INITIAL_COURTS));
    const athletes = JSON.parse(JSON.stringify(INITIAL_ATHLETES));
    const tournament = JSON.parse(JSON.stringify(INITIAL_TOURNAMENT));
    const pointsTable = JSON.parse(JSON.stringify(DEFAULT_POINTS_TABLE));

    // Gera o grafo da categoria Profissional sem BYEs pré-definidos e sem estados escalados
    const brackets = {};
    brackets['prof'] = createGraphBracket(federations, 'prof', []);

    const state = {
      tournament,
      federations,
      categories,
      courts,
      athletes,
      brackets,
      categoryByes: { prof: [] },
      categoryDrawnSeeds: {},
      pointsTable,
      lastUpdated: '1970-01-01T00:00:00.000Z'
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.error('Falha ao gravar semente inicial:', e);
    }

    return state;
  }

  save(syncToRemote = true, actionSummary = '') {
    this.state.lastUpdated = new Date().toISOString();
    if (actionSummary) {
      this.state.lastAction = {
        summary: actionSummary,
        time: this.state.lastUpdated,
        author: 'Baumann'
      };
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
    this.notify();

    if (this.broadcastChannel && syncToRemote) {
      try {
        this.broadcastChannel.postMessage({
          summary: actionSummary || 'Dados atualizados pelo administrador (Baumann)',
          state: this.state
        });
      } catch (err) {
        console.warn('Erro ao postar no BroadcastChannel:', err);
      }
    }

    const cloud = typeof window !== 'undefined' ? (window.firebaseService || window.supabaseService) : null;
    if (syncToRemote && cloud && typeof cloud.pushState === 'function') {
      cloud.pushState(this.state);
    }
  }

  loadFromRemote(remoteState, saveToStorage = true, customSummary = null) {
    if (!remoteState || !remoteState.brackets) {
      console.warn('[Store] Estado remoto inválido descartado.');
      return false;
    }
    const seed = this.createInitialSeed();
    this.state = {
      ...seed,
      ...remoteState,
      brackets: remoteState.brackets || seed.brackets,
      categories: (remoteState.categories && remoteState.categories.length > 0) ? remoteState.categories : seed.categories,
      federations: (remoteState.federations && remoteState.federations.length > 0) ? remoteState.federations : seed.federations,
      categoryParticipants: remoteState.categoryParticipants || seed.categoryParticipants || {},
      categoryByes: remoteState.categoryByes || seed.categoryByes || {},
      users: (remoteState.users && remoteState.users.length > 0) ? remoteState.users : (this.state.users || seed.users)
    };

    if (!remoteState.athletes || remoteState.athletes.length < 2000 || remoteState._athletes_version !== CBT_OFFICIAL_ATHLETES_VERSION) {
      this.state.athletes = JSON.parse(JSON.stringify(INITIAL_ATHLETES));
      this.state._athletes_version = CBT_OFFICIAL_ATHLETES_VERSION;
    } else {
      this.state.athletes.forEach(a => {
        a.genero = getAthleteGender(a);
      });
    }

    // Regra: quando não tiver nenhum estado selecionado como Bye na categoria,
    // nos confrontos também não pode ter nenhum estado selecionado na primeira fase
    if (this.state.brackets) {
      Object.keys(this.state.brackets).forEach(catId => {
        const catByes = (this.state.categoryByes && this.state.categoryByes[catId]) || [];
        if (catByes.length === 0 && this.state.brackets[catId]) {
          const hasR32Team = this.state.brackets[catId].some(
            g => g.fase === '1ª Fase' && (g.lado_a || g.lado_b)
          );
          if (hasR32Team) {
            const feds = this.getCategoryParticipatingFeds(catId);
            this.state.brackets[catId] = createGraphBracket(feds, catId, []);
          }
        }
      });
    }
    if (saveToStorage && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Erro ao salvar cache local:', e);
      }
    }
    this.notify();

    // Notifica visualmente todos os usuários sobre a ação do administrador
    const summary = customSummary || (remoteState.lastAction ? remoteState.lastAction.summary : 'Placares e chaves atualizados pela Arbitragem.');
    if (window.showLiveUpdateToast && typeof window.showLiveUpdateToast === 'function') {
      window.showLiveUpdateToast(summary);
    }
    return true;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Erro em listener do store:', err);
      }
    }
  }

  // ==========================================
  // GESTÃO DE USUÁRIOS
  // ==========================================
  getUsers() {
    if (!this.state.users || !Array.isArray(this.state.users) || this.state.users.length === 0) {
      this.state.users = [
        { id: 'u_baumann', username: 'Baumann', name: 'Baumann', password: 'Daniel0306', role: 'admin' }
      ];
    }
    return this.state.users;
  }

  saveUser(userData) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.id === userData.id || u.username.toLowerCase() === userData.username.toLowerCase());
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...userData };
    } else {
      users.push({
        id: userData.id || `u_${Date.now()}`,
        username: userData.username,
        name: userData.name || userData.username,
        password: userData.password,
        role: userData.role || 'admin'
      });
    }
    this.save(true, 'Usuários do sistema atualizados');
    return true;
  }

  deleteUser(userId) {
    const users = this.getUsers();
    // Impede excluir se for o único admin
    const admins = users.filter(u => u.role === 'admin');
    const target = users.find(u => u.id === userId);
    if (target?.role === 'admin' && admins.length <= 1) {
      return { success: false, message: 'Não é possível remover o único administrador do sistema.' };
    }
    this.state.users = users.filter(u => u.id !== userId);
    this.save(true, 'Usuário removido do sistema');
    return { success: true };
  }

  // ==========================================
  // GETTERS
  // ==========================================
  getTournament() {
    return this.state.tournament;
  }

  getFederations() {
    return [...this.state.federations].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  getFederation(id) {
    return this.state.federations.find(f => f.id === id);
  }

  getCategories() {
    return this.state.categories;
  }

  getActiveCategories() {
    return this.state.categories.filter(c => c.ativa);
  }

  getCourts() {
    return this.state.courts;
  }

  getAthletes() {
    if (!this.state.athletes || this.state.athletes.length < 2000 || this.state._athletes_version !== CBT_OFFICIAL_ATHLETES_VERSION) {
      this.state.athletes = JSON.parse(JSON.stringify(INITIAL_ATHLETES));
      this.state._athletes_version = CBT_OFFICIAL_ATHLETES_VERSION;
    }
    this.state.athletes.forEach(a => {
      if (!a.genero || a.genero === 'F' || a.genero === 'M' || a.genero === 'undefined') {
        a.genero = getAthleteGender(a);
      }
    });
    return this.state.athletes;
  }

  getPointsTable() {
    if (!this.state.pointsTable || Object.keys(this.state.pointsTable).length === 0) {
      this.state.pointsTable = JSON.parse(JSON.stringify(DEFAULT_POINTS_TABLE));
    } else {
      let updated = false;
      for (let pos = 1; pos <= 27; pos++) {
        if (this.state.pointsTable[pos] === undefined || this.state.pointsTable[pos] === null) {
          this.state.pointsTable[pos] = DEFAULT_POINTS_TABLE[pos];
          updated = true;
        }
      }
      if (updated) this.save(false);
    }
    return this.state.pointsTable;
  }

  getCategoryParticipatingFeds(categoryId) {
    if (!this.state.categoryParticipants) {
      this.state.categoryParticipants = {};
    }
    const ids = this.state.categoryParticipants[categoryId];
    if (Array.isArray(ids)) {
      return this.state.federations
        .filter(f => ids.includes(f.id))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return [...this.state.federations].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  setCategoryParticipatingFeds(categoryId, fedIds) {
    if (!this.state.categoryParticipants) {
      this.state.categoryParticipants = {};
    }
    this.state.categoryParticipants[categoryId] = fedIds;
    
    const feds = this.getCategoryParticipatingFeds(categoryId);
    const numByes = Math.max(0, 32 - fedIds.length);

    // Validar os BYEs atuais para garantir que só tenham federações participantes
    let byes = (this.getCategoryByes(categoryId) || []).filter(id => fedIds.includes(id));
    byes = byes.slice(0, numByes);
    this.setCategoryByes(categoryId, byes, false);
    
    // Gera o chaveamento colocando APENAS os estados de BYE; se não houver BYEs, a 1ª fase fica totalmente vazia
    this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, byes);
    this.save();
    return feds;
  }

  getCategoryByes(categoryId) {
    if (!this.state.categoryByes) {
      this.state.categoryByes = {};
    }
    return this.state.categoryByes[categoryId] || [];
  }

  setCategoryByes(categoryId, byeFedIds, updateBracket = true) {
    if (!this.state.categoryByes) {
      this.state.categoryByes = {};
    }
    this.state.categoryByes[categoryId] = byeFedIds;
    
    if (updateBracket) {
      const feds = this.getCategoryParticipatingFeds(categoryId);
      this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, byeFedIds);
      const actionSummary = (byeFedIds && byeFedIds.length > 0)
        ? `BYEs da categoria ${categoryId} atualizados`
        : `BYEs e estados dos confrontos da categoria ${categoryId} limpos`;
      this.save(true, actionSummary);
    }
  }

  getCategoryDrawnSeeds(categoryId) {
    if (!this.state.categoryDrawnSeeds) {
      this.state.categoryDrawnSeeds = {};
    }
    return this.state.categoryDrawnSeeds[categoryId] || {};
  }

  setCategoryDrawnSeed(categoryId, slotIndex, fedId) {
    if (!this.state.categoryDrawnSeeds) {
      this.state.categoryDrawnSeeds = {};
    }
    if (!this.state.categoryDrawnSeeds[categoryId]) {
      this.state.categoryDrawnSeeds[categoryId] = {};
    }
    if (fedId) {
      this.state.categoryDrawnSeeds[categoryId][slotIndex] = fedId;
    } else {
      delete this.state.categoryDrawnSeeds[categoryId][slotIndex];
    }
    this.save(true, `Vaga sorteada #${slotIndex} de cabeça de chave atualizada`);
  }

  getGames(categoryId = 'prof') {
    const byes = this.getCategoryByes(categoryId);
    const feds = this.getCategoryParticipatingFeds(categoryId);

    if (!this.state.brackets[categoryId]) {
      this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, byes);
      this.save(false);
    } else if (byes.length === 0) {
      // Regra oficial: quando não tiver nenhum estado selecionado como Bye na categoria,
      // nos confrontos também não pode ter nenhum estado selecionado na primeira fase
      const hasAnyR32Team = this.state.brackets[categoryId].some(
        g => g.fase === '1ª Fase' && (g.lado_a || g.lado_b)
      );
      if (hasAnyR32Team) {
        this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, []);
        this.save(false);
      }
    }
    return this.state.brackets[categoryId];
  }

  getAllGames() {
    const list = [];
    Object.keys(this.state.brackets).forEach(catId => {
      list.push(...this.state.brackets[catId]);
    });
    return list;
  }

  // ==========================================
  // CHAVEAMENTO & RESULTADOS
  // ==========================================
  generateBracket(categoryId, shuffle = false) {
    let feds = [...this.getCategoryParticipatingFeds(categoryId)];
    if (shuffle) {
      // Embaralha não-cabeças de chave (seeds 1 a 4 mantêm posições relativas)
      const top4 = feds.filter(f => f.seed && f.seed <= 4);
      const others = feds.filter(f => !f.seed || f.seed > 4);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      feds = [...top4, ...others];
    }
    this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, this.getCategoryByes(categoryId));
    this.save();
    return this.state.brackets[categoryId];
  }

  clearCategoryResults(categoryId) {
    const games = this.getGames(categoryId);
    games.forEach(g => {
      if (g.is_bye) {
        g.vitorias_a = 0; g.vitorias_b = 0;
        g.placar_jogo1 = ''; g.resultado_jogo1 = null;
        g.placar_jogo2 = ''; g.resultado_jogo2 = null;
        g.placar_jogo3 = ''; g.resultado_jogo3 = null;
      } else {
        g.vitorias_a = 0; g.vitorias_b = 0;
        g.placar_jogo1 = ''; g.resultado_jogo1 = null;
        g.placar_jogo2 = ''; g.resultado_jogo2 = null;
        g.placar_jogo3 = ''; g.resultado_jogo3 = null;
        g.vencedor_id = null; g.perdedor_id = null;
        if (g.fase === '1ª Fase') {
          g.status = 'aguardando';
        } else {
          g.lado_a = null;
          g.lado_b = null;
          g.status = 'aguardando';
        }
      }
    });
    propagateAllByes(games);
    this.save();
    return { success: true, message: 'Todos os resultados foram limpos!' };
  }

  recordMatchResult(categoryId, gameCode, resultData) {
    const games = this.getGames(categoryId);
    const targetGame = games.find(g => g.code === gameCode);
    if (!targetGame) return { success: false, message: 'Jogo não encontrado' };

    // Guarda no stack de desfazer
    this.undoStack.push({
      action: 'match_result',
      categoryId,
      gameCode,
      snapshot: JSON.parse(JSON.stringify(targetGame))
    });

    const res = propagateMatchResult(games, gameCode, resultData);
    if (res.success) {
      const teamAName = targetGame.lado_a?.uf || 'A';
      const teamBName = targetGame.lado_b?.uf || 'B';
      let summary = `Confronto ${gameCode} atualizado (${teamAName} vs ${teamBName})`;
      if (res.winnerPropagated) {
        summary += ` • Vencedor ${res.winnerPropagated.team} avançou para ${res.winnerPropagated.code}!`;
      }
      this.save(true, summary);
    }
    return res;
  }

  undoLastAction() {
    if (this.undoStack.length === 0) {
      return { success: false, message: 'Nenhuma ação recente para desfazer.' };
    }

    const last = this.undoStack.pop();
    if (last.action === 'match_result') {
      const games = this.getGames(last.categoryId);
      const res = revertMatchResult(games, last.gameCode, last.snapshot);
      if (res.success) {
        this.save();
        return { success: true, message: `Resultado do jogo ${last.gameCode} desfeito com sucesso!` };
      }
    }
    return { success: false, message: 'Não foi possível reverter a ação.' };
  }

  // ==========================================
  // EDIÇÃO DE CONFRONTOS DA 1ª RODADA E BYES
  // ==========================================
  updateFirstRoundMatch(categoryId, gameCode, teamAId, teamBId, isBye, byeSlot = 'B') {
    const games = this.getGames(categoryId);
    const isByeA = teamAId === 'BYE' || teamAId === 'bye';
    const isByeB = teamBId === 'BYE' || teamBId === 'bye';
    const isActuallyBye = Boolean(isBye || isByeA || isByeB);
    const effectiveByeSlot = (isByeB || (!teamBId && isActuallyBye)) ? 'B' : ((isByeA || (!teamAId && isActuallyBye)) ? 'A' : byeSlot);

    const teamA = (teamAId && !isByeA) ? this.getFederation(teamAId) : null;
    const teamB = (teamBId && !isByeB) ? this.getFederation(teamBId) : null;

    const oldGame = games.find(g => g.code === gameCode);
    const wasBye = oldGame ? oldGame.is_bye : false;
    const oldTeamA = oldGame ? oldGame.lado_a : null;
    const oldTeamB = oldGame ? oldGame.lado_b : null;

    const res = updateFirstRoundMatch(games, gameCode, teamA, teamB, isActuallyBye, effectiveByeSlot);
    if (res.success) {
      let byesList = [...this.getCategoryByes(categoryId)];
      
      let oldTeamId = null;
      if (wasBye) oldTeamId = (oldTeamB && oldTeamB.id === 'bye') ? oldTeamA?.id : oldTeamB?.id;
      if (!oldTeamId && wasBye) oldTeamId = oldTeamA?.id; // fallback
      
      let newTeamId = null;
      if (isActuallyBye) newTeamId = (effectiveByeSlot === 'B') ? teamA?.id : teamB?.id;
      
      if (wasBye && isActuallyBye) {
        // Swap while preserving rank
        if (oldTeamId && newTeamId && oldTeamId !== newTeamId) {
          let idx = byesList.indexOf(oldTeamId);
          if (idx !== -1) byesList[idx] = newTeamId;
          else byesList.push(newTeamId);
        }
      } else {
        if (wasBye && oldTeamId) byesList = byesList.filter(id => id !== oldTeamId);
        if (isActuallyBye && newTeamId && !byesList.includes(newTeamId)) byesList.push(newTeamId);
      }
      
      if (!this.state.categoryByes) this.state.categoryByes = {};
      this.state.categoryByes[categoryId] = byesList;

      this.save(true, `Confronto ${gameCode} atualizado pela Arbitragem`);
    }
    return res;
  }

  // Atualiza diretamente uma das equipes (lado A ou lado B) de qualquer confronto
  updateMatchTeamSlot(categoryId, gameCode, slot = 'A', newTeamId = '') {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    if (!game) return { success: false, message: 'Jogo não encontrado.' };

    const isByeChosen = newTeamId === 'BYE' || newTeamId === 'bye';
    const newTeam = (newTeamId && !isByeChosen) ? this.getFederation(newTeamId) : null;

    if (game.fase === '1ª Fase') {
      const currentTeamAId = slot === 'A' ? (isByeChosen ? null : (newTeam?.id || null)) : game.lado_a?.id;
      const currentTeamBId = slot === 'B' ? (isByeChosen ? null : (newTeam?.id || null)) : game.lado_b?.id;
      const isBye = isByeChosen || (!currentTeamAId && Boolean(currentTeamBId)) || (Boolean(currentTeamAId) && !currentTeamBId);
      const byeSlot = isByeChosen ? slot : (isBye ? (!currentTeamBId ? 'B' : 'A') : 'B');
      return this.updateFirstRoundMatch(categoryId, gameCode, currentTeamAId, currentTeamBId, isBye, byeSlot);
    }

    // Para fases seguintes (Oitavas, Quartas, Semis, Finais, Repescagem)
    if (slot === 'A') {
      game.lado_a = isByeChosen ? null : newTeam;
      if (isByeChosen) {
        game.is_bye = true;
        game.bye_slot = 'A';
        game.vencedor_id = game.lado_b?.id || null;
        game.status = game.vencedor_id ? 'encerrado' : 'aguardando';
      }
    } else {
      game.lado_b = isByeChosen ? null : newTeam;
      if (isByeChosen) {
        game.is_bye = true;
        game.bye_slot = 'B';
        game.vencedor_id = game.lado_a?.id || null;
        game.status = game.vencedor_id ? 'encerrado' : 'aguardando';
      }
    }

    if (!isByeChosen && game.is_bye) {
      if ((slot === 'A' && game.bye_slot === 'A') || (slot === 'B' && game.bye_slot === 'B')) {
        game.is_bye = false;
        game.bye_slot = null;
        game.status = (game.lado_a && game.lado_b) ? 'em espera' : 'aguardando';
        game.vencedor_id = null;
      }
    }

    propagateAllByes(games);
    this.save();
    return { success: true, game };
  }

  // Define qualquer confronto (em qualquer fase) como BYE / Vaga Livre e avança a equipe diretamente
  setMatchAsBye(categoryId, gameCode, winningSide = 'A') {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    if (!game) return { success: false, message: 'Jogo não encontrado.' };

    const winTeam = winningSide === 'B' ? game.lado_b : game.lado_a;
    if (!winTeam) return { success: false, message: 'Nenhuma equipe selecionada para avançar.' };

    game.is_bye = true;
    game.bye_slot = winningSide === 'B' ? 'A' : 'B';
    game.status = 'encerrado';
    game.vencedor_id = winTeam.id;
    game.perdedor_id = null;
    game.vitorias_a = 0;
    game.vitorias_b = 0;
    game.resultado_jogo1 = null;
    game.placar_jogo1 = '';
    game.resultado_jogo2 = null;
    game.placar_jogo2 = '';
    game.resultado_jogo3 = null;
    game.placar_jogo3 = '';

    propagateAllByes(games);
    this.save();
    return { success: true, game, winTeam };
  }

  saveAllFirstRoundMatchups(categoryId, matchups) {
    const games = this.getGames(categoryId);

    // Salva snapshot para undo caso necessário
    const r32Games = games.filter(g => g.fase === '1ª Fase');
    this.undoStack.push({
      action: 'config_first_round',
      categoryId,
      snapshot: JSON.parse(JSON.stringify(r32Games))
    });

    let byesList = [...this.getCategoryByes(categoryId)];
    
    // Map existing BYE games to their active team IDs so we know who to replace
    const oldByesMap = {};
    const r32GamesForMap = games.filter(g => g.fase === '1ª Fase');
    r32GamesForMap.forEach(g => {
      if (g.is_bye) {
        let teamId = (g.lado_b && g.lado_b.id === 'bye') ? g.lado_a?.id : g.lado_b?.id;
        if (!teamId) teamId = g.lado_a?.id;
        oldByesMap[g.code] = teamId;
      }
    });

    for (const item of matchups) {
      const isBye = Boolean(item.isBye || (item.teamAId && !item.teamBId) || (!item.teamAId && item.teamBId));
      const byeSlot = (!item.teamBId) ? 'B' : ((!item.teamAId) ? 'A' : (item.byeSlot || 'B'));
      const teamA = item.teamAId ? this.getFederation(item.teamAId) : null;
      const teamB = isBye && byeSlot === 'B' ? null : (item.teamBId ? this.getFederation(item.teamBId) : null);
      
      const oldTeamId = oldByesMap[item.code];
      let newTeamId = null;
      if (isBye) newTeamId = (byeSlot === 'B') ? item.teamAId : item.teamBId;
      
      if (oldTeamId && isBye) {
        if (newTeamId && oldTeamId !== newTeamId) {
          let idx = byesList.indexOf(oldTeamId);
          if (idx !== -1) byesList[idx] = newTeamId;
          else byesList.push(newTeamId);
        }
      } else {
        if (oldTeamId) byesList = byesList.filter(id => id !== oldTeamId);
        if (isBye && newTeamId && !byesList.includes(newTeamId)) byesList.push(newTeamId);
      }
      
      updateFirstRoundMatch(games, item.code, teamA, teamB, isBye, byeSlot);
    }

    if (!this.state.categoryByes) this.state.categoryByes = {};
    this.state.categoryByes[categoryId] = byesList;

    this.save(true, 'Chaveamento da 1ª rodada atualizado pela Arbitragem');
    return { success: true, message: 'Chaveamento da 1ª rodada atualizado com sucesso!' };
  }

  // ==========================================
  // PROGRAMAÇÃO / AGENDAMENTO
  // ==========================================
  scheduleMatch(categoryId, gameCode, courtId, timeStr) {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    if (!game) return { success: false, message: 'Jogo não encontrado.' };

    // Validação 1: Jogo precisa ter os 2 lados definidos
    if (!game.lado_a || !game.lado_b) {
      return {
        success: false,
        message: 'Apenas jogos com as duas equipes definidas podem ser agendados.'
      };
    }

    // Validação 2: Equipe não pode jogar em duas quadras no mesmo horário
    if (courtId && timeStr) {
      const allActive = this.getAllGames();
      const conflict = allActive.find(g => {
        if (g.code === gameCode) return false;
        if (g.horario === timeStr) {
          const sameTeamA = (g.lado_a?.id === game.lado_a.id || g.lado_b?.id === game.lado_a.id);
          const sameTeamB = (g.lado_a?.id === game.lado_b.id || g.lado_b?.id === game.lado_b.id);
          return sameTeamA || sameTeamB;
        }
        return false;
      });

      if (conflict) {
        return {
          success: false,
          message: `Conflito de horário! Uma das equipes (${conflict.lado_a?.sigla} ou ${conflict.lado_b?.sigla}) já está jogando às ${timeStr} na ${this.getCourtName(conflict.quadra_id)}.`
        };
      }
    }

    game.quadra_id = courtId || null;
    game.horario = timeStr || null;
    if (game.status === 'aguardando' && game.lado_a && game.lado_b) {
      game.status = 'em espera';
    }

    this.save(true, `Confronto ${gameCode} agendado para ${timeStr || 'horário livre'} na ${this.getCourtName(courtId)}`);
    return { success: true, game };
  }

  setGameStatus(categoryId, gameCode, status) {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    if (game) {
      game.status = status;
      this.save();
      return true;
    }
    return false;
  }

  getCourtName(courtId) {
    const c = this.state.courts.find(item => item.id === courtId);
    return c ? c.nome : 'Quadra não definida';
  }

  // ==========================================
  // ESCALAÇÃO DE ATLETAS POR CONFRONTO
  // ==========================================
  saveGameLineup(categoryId, gameCode, lineup) {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    if (!game) return { success: false, message: 'Jogo não encontrado.' };

    game.escalacao = lineup;
    this.save(true, `Escalação do confronto ${gameCode} atualizada`);
    return { success: true, message: 'Escalação salva com sucesso!' };
  }

  clearGameLineup(categoryId, gameCode) {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    if (!game) return { success: false, message: 'Jogo não encontrado.' };

    game.escalacao = null;
    this.save(true, `Escalação do confronto ${gameCode} removida`);
    return { success: true, message: 'Escalação removida com sucesso!' };
  }

  getGameLineup(categoryId, gameCode) {
    const games = this.getGames(categoryId);
    const game = games.find(g => g.code === gameCode);
    return game?.escalacao || null;
  }

  // ==========================================
  // VALIDAÇÕES DE ATLETA
  // ==========================================
  checkAthleteConflict(nome, equipeId, categoryId, currentAthleteId = null) {
    const athletes = this.state.athletes || [];
    const normalizedName = nome.trim().toLowerCase();

    // Regra: Um atleta não pode representar 2 equipes na mesma categoria
    for (const ath of athletes) {
      if (currentAthleteId && ath.id === currentAthleteId) continue;
      if (ath.nome.trim().toLowerCase() === normalizedName) {
        if (ath.equipe_id !== equipeId && ath.categorias.includes(categoryId)) {
          const otherFed = this.getFederation(ath.equipe_id);
          return {
            hasConflict: true,
            message: `O atleta "${nome}" já está inscrito na mesma categoria (${categoryId}) representando a equipe ${otherFed?.nome || ath.equipe_id}!`
          };
        }
      }
    }
    return { hasConflict: false };
  }

  addAthlete(athlete) {
    if (!this.state.athletes) this.state.athletes = [];
    const newAth = {
      id: 'ath_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      nome: athlete.nome.trim(),
      equipe_id: athlete.equipe_id,
      uf: athlete.uf || (athlete.equipe_id ? athlete.equipe_id.toUpperCase() : ''),
      cbt_id: athlete.cbt_id || '',
      idade: athlete.idade || null,
      genero: String(athlete.genero || '').toUpperCase().startsWith('F') ? 'Feminino' : 'Masculino',
      funcao: athlete.funcao || null,
      is_capitao: Boolean(athlete.is_capitao || athlete.funcao === 'Capitão'),
      categorias: athlete.categorias || []
    };
    this.state.athletes.push(newAth);
    this.save();
    return newAth;
  }

  updateAthlete(id, data) {
    const ath = this.state.athletes.find(a => a.id === id);
    if (ath) {
      Object.assign(ath, data);
      this.save();
      return ath;
    }
    return null;
  }

  deleteAthlete(id) {
    this.state.athletes = this.state.athletes.filter(a => a.id !== id);
    this.save();
  }

  setAthletes(athletes) {
    this.state.athletes = athletes;
    this.save(true, 'Relação de atletas atualizada');
  }

  resetAthletesToOfficialCBT() {
    this.state.athletes = JSON.parse(JSON.stringify(INITIAL_ATHLETES));
    this.state._athletes_version = CBT_OFFICIAL_ATHLETES_VERSION;
    this.save(true, 'Base oficial de atletas do Tênis Integrado CBT restaurada');
    return this.state.athletes;
  }

  bulkImportAthletes(lines, defaultEquipeId = null) {
    let imported = 0;
    let conflicts = 0;
    if (!this.state.athletes) this.state.athletes = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.toLowerCase().startsWith('nome') || line.toLowerCase().startsWith('atleta')) continue;

      // Suporta separadores tab, ponto-e-vírgula, vírgula ou pipe
      let parts = line.includes('\t') ? line.split('\t') : (line.includes(';') ? line.split(';') : (line.includes('|') ? line.split('|') : line.split(',')));
      parts = parts.map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;

      let nome = parts[0];
      let equipeId = defaultEquipeId;
      let cats = [];
      let cbtId = '';

      // Tenta detectar se a primeira coluna é um número ou ID CBT (ex: 1, 2 ou CBT-1234)
      if (/^\d+$/.test(nome) && parts.length > 1) {
        nome = parts[1];
        parts = [nome, ...parts.slice(2)];
      }

      // Procura por UF ou Sigla de Federação nas colunas
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (p.toUpperCase().startsWith('CBT-')) {
          cbtId = p.toUpperCase();
          continue;
        }
        const fedMatch = this.state.federations.find(f => 
          f.uf.toLowerCase() === p.toLowerCase() || 
          f.sigla.toLowerCase() === p.toLowerCase() ||
          f.id.toLowerCase() === p.toLowerCase() ||
          f.nome.toLowerCase() === p.toLowerCase()
        );
        if (fedMatch) {
          equipeId = fedMatch.id;
          continue;
        }

        // Tenta mapear categoria
        const pNorm = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (pNorm.includes('prof') || pNorm === 'pro') cats.push('prof');
        else if (pNorm === 'cata' || pNorm === 'a') cats.push('cat_a');
        else if (pNorm === 'catb' || pNorm === 'b') cats.push('cat_b');
        else if (pNorm === 'catc' || pNorm === 'c') cats.push('cat_c');
        else if (pNorm.includes('sub12') || pNorm.includes('12')) cats.push('sub12');
        else if (pNorm.includes('sub14') || pNorm.includes('14')) cats.push('sub14');
        else if (pNorm.includes('sub16') || pNorm.includes('16')) cats.push('sub16');
        else if (pNorm.includes('sub18') || pNorm.includes('18')) cats.push('sub18');
        else if (pNorm.includes('40') || pNorm.includes('master40')) cats.push('master40');
        else if (pNorm.includes('50') || pNorm.includes('master50')) cats.push('master50');
        else if (pNorm.includes('60') || pNorm.includes('master60')) cats.push('master60');
      }

      if (cats.length === 0) cats = ['prof'];
      if (!equipeId) equipeId = defaultEquipeId;

      if (nome && equipeId) {
        // Verifica se já existe atleta com o mesmo nome nessa equipe
        const existing = this.state.athletes.find(a => 
          a.nome.toLowerCase() === nome.toLowerCase() && a.equipe_id === equipeId
        );
        if (existing) {
          existing.categorias = Array.from(new Set([...(existing.categorias || []), ...cats]));
          if (cbtId) existing.cbt_id = cbtId;
        } else {
          this.state.athletes.push({
            id: 'ath_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            nome,
            equipe_id: equipeId,
            categorias: cats,
            cbt_id: cbtId || `CBT-${Math.floor(10000 + Math.random() * 90000)}`
          });
        }
        imported++;
      }
    }

    this.save(true, `${imported} atletas importados do Tênis Integrado CBT`);
    return { imported, conflicts };
  }

  // ==========================================
  // CONFIGURAÇÃO DO TORNEIO
  // ==========================================
  updateTournament(data) {
    Object.assign(this.state.tournament, data);
    this.save();
  }

  toggleCategory(catId, ativa) {
    const cat = this.state.categories.find(c => c.id === catId);
    if (cat) {
      cat.ativa = ativa;
      this.save();
    }
  }

  updatePointsTable(newTable) {
    this.state.pointsTable = { ...DEFAULT_POINTS_TABLE, ...this.state.pointsTable, ...newTable };
    this.save();
  }

  restoreDefaultPointsTable() {
    this.state.pointsTable = JSON.parse(JSON.stringify(DEFAULT_POINTS_TABLE));
    this.save();
    return this.state.pointsTable;
  }

  updateCourts(courts) {
    this.state.courts = courts;
    this.save();
  }

  resetAllData() {
    this.state = this.createInitialSeed();
    this.undoStack = [];
    this.save();
    return true;
  }

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data && data.federations && data.tournament) {
        this.state = data;
        this.save();
        return { success: true };
      }
      return { success: false, message: 'Estrutura JSON inválida para a Copa Federações.' };
    } catch (e) {
      return { success: false, message: 'JSON mal formatado: ' + e.message };
    }
  }
}

export const store = new AppStore();

if (typeof window !== 'undefined') {
  window.store = store;
}
