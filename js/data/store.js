// Armazenamento central com persistência em localStorage e reatividade
import { INITIAL_FEDERATIONS, INITIAL_ATHLETES } from './federations.js';
import { INITIAL_CATEGORIES, DEFAULT_POINTS_TABLE, INITIAL_COURTS, INITIAL_TOURNAMENT } from './categories.js';
import { createGraphBracket, propagateMatchResult, revertMatchResult, updateFirstRoundMatch, propagateAllByes } from '../modules/bracketEngine.js';

const STORAGE_KEY = 'copa_federacoes_2026_db_v1';

class AppStore {
  constructor() {
    this.listeners = [];
    this.undoStack = [];
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
              }

              // Propaga automaticamente confrontos com Vaga Livre (BYE) para a próxima fase
              propagateAllByes(gamesList);
            }
          });

          // Garante que todas as federações tenham a propriedade imagem
          if (Array.isArray(parsed.federations)) {
            parsed.federations.forEach(f => {
              if (!f.imagem) {
                f.imagem = `assets/federations/${f.id}.svg`;
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
              if (parsed.brackets[catId] && parsed.brackets[catId].length < 75) {
                const feds = (parsed.categoryParticipants && parsed.categoryParticipants[catId])
                  ? parsed.categoryParticipants[catId].map(id => INITIAL_FEDERATIONS.find(f => f.id === id)).filter(Boolean)
                  : INITIAL_FEDERATIONS;
                parsed.brackets[catId] = createGraphBracket(feds, catId);
              }
            });
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

    // Gera o grafo da categoria Profissional imediatamente
    const brackets = {};
    brackets['prof'] = createGraphBracket(federations, 'prof');

    // Agenda os primeiros jogos da 1ª fase nas quadras para início imediato
    const activeFirstRoundGames = brackets['prof'].filter(g => !g.is_bye && g.lado_a && g.lado_b);
    const times = ['08:30', '09:30', '10:30', '11:30', '13:00', '14:00', '15:00', '16:00'];
    
    // Distribui alguns jogos em andamento e em espera para o operador ver na hora
    if (activeFirstRoundGames.length >= 6) {
      // Jogo 1 na Quadra Central (em andamento)
      activeFirstRoundGames[0].quadra_id = 'q1';
      activeFirstRoundGames[0].horario = '08:30';
      activeFirstRoundGames[0].status = 'em andamento';
      activeFirstRoundGames[0].resultado_jogo1 = 'a';
      activeFirstRoundGames[0].placar_jogo1 = '6/4 6/3';
      activeFirstRoundGames[0].vitorias_a = 1;
      activeFirstRoundGames[0].vitorias_b = 0;

      // Jogo 2 na Quadra 2 (em andamento)
      activeFirstRoundGames[1].quadra_id = 'q2';
      activeFirstRoundGames[1].horario = '08:30';
      activeFirstRoundGames[1].status = 'em andamento';
      activeFirstRoundGames[1].resultado_jogo1 = 'b';
      activeFirstRoundGames[1].placar_jogo1 = '3/6 4/6';
      activeFirstRoundGames[1].resultado_jogo2 = 'a';
      activeFirstRoundGames[1].placar_jogo2 = '6/2 6/4';
      activeFirstRoundGames[1].vitorias_a = 1;
      activeFirstRoundGames[1].vitorias_b = 1; // 1x1 empate, vai para DX!

      // Jogos agendados em espera
      activeFirstRoundGames[2].quadra_id = 'q3';
      activeFirstRoundGames[2].horario = '08:30';
      activeFirstRoundGames[2].status = 'em espera';

      activeFirstRoundGames[3].quadra_id = 'q4';
      activeFirstRoundGames[3].horario = '08:30';
      activeFirstRoundGames[3].status = 'em espera';

      activeFirstRoundGames[4].quadra_id = 'q1';
      activeFirstRoundGames[4].horario = '09:30';
      activeFirstRoundGames[4].status = 'em espera';

      activeFirstRoundGames[5].quadra_id = 'q2';
      activeFirstRoundGames[5].horario = '09:30';
      activeFirstRoundGames[5].status = 'em espera';
    }

    const state = {
      tournament,
      federations,
      categories,
      courts,
      athletes,
      brackets,
      pointsTable,
      lastUpdated: new Date().toISOString()
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

  save() {
    this.state.lastUpdated = new Date().toISOString();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
    this.notify();
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
    return this.state.athletes || [];
  }

  getPointsTable() {
    return this.state.pointsTable;
  }

  getCategoryParticipatingFeds(categoryId) {
    if (!this.state.categoryParticipants) {
      this.state.categoryParticipants = {};
    }
    const ids = this.state.categoryParticipants[categoryId];
    if (Array.isArray(ids)) {
      return this.state.federations.filter(f => ids.includes(f.id));
    }
    return [...this.state.federations];
  }

  setCategoryParticipatingFeds(categoryId, fedIds) {
    if (!this.state.categoryParticipants) {
      this.state.categoryParticipants = {};
    }
    this.state.categoryParticipants[categoryId] = fedIds;
    
    // Validar os BYEs atuais para garantir que só tenham feds selecionadas e respeitem o limite
    const byes = this.getCategoryByes(categoryId);
    const validByes = byes.filter(id => fedIds.includes(id));
    const numByes = Math.max(0, 32 - fedIds.length);
    this.setCategoryByes(categoryId, validByes.slice(0, numByes), false);
    
    const feds = this.getCategoryParticipatingFeds(categoryId);
    this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, this.getCategoryByes(categoryId));
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
      this.save();
    }
  }

  getGames(categoryId = 'prof') {
    if (!this.state.brackets[categoryId]) {
      const feds = this.getCategoryParticipatingFeds(categoryId);
      this.state.brackets[categoryId] = createGraphBracket(feds, categoryId, this.getCategoryByes(categoryId));
      this.save();
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
      this.save();
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
    const teamA = teamAId ? this.getFederation(teamAId) : null;
    const teamB = teamBId ? this.getFederation(teamBId) : null;

    const isActuallyBye = Boolean(isBye || (teamAId && !teamBId) || (!teamAId && teamBId));
    const effectiveByeSlot = (!teamBId) ? 'B' : ((!teamAId) ? 'A' : byeSlot);

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

      this.save();
    }
    return res;
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

    this.save();
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

    this.save();
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

  bulkImportAthletes(lines, defaultEquipeId = null) {
    // Formato aceito: Nome; SiglaEquipe ou UF; Categorias separadas por vírgula
    let imported = 0;
    let conflicts = 0;

    for (const line of lines) {
      const parts = line.split(/[;,]/).map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;

      const nome = parts[0];
      let equipeId = defaultEquipeId;
      let cats = ['prof'];

      if (parts.length >= 2) {
        const fedMatch = this.state.federations.find(f => 
          f.uf.toLowerCase() === parts[1].toLowerCase() || 
          f.sigla.toLowerCase() === parts[1].toLowerCase() ||
          f.id.toLowerCase() === parts[1].toLowerCase()
        );
        if (fedMatch) equipeId = fedMatch.id;
      }

      if (parts.length >= 3) {
        cats = parts.slice(2);
      }

      if (equipeId) {
        this.addAthlete({
          nome,
          equipe_id: equipeId,
          categorias: cats
        });
        imported++;
      }
    }

    this.save();
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
    this.state.pointsTable = { ...this.state.pointsTable, ...newTable };
    this.save();
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

window.store = store;
