// Posições estratégicas de BYEs para garantir os quadrantes: Top (1, 3, 6), Bottom (5, 4, 2)
const STANDARD_BYE_SLOTS_32 = [1, 30, 9, 22, 17, 14, 25, 6, 19, 11, 27, 3, 29, 5, 21, 13];

export function createGraphBracket(federations, categoryId, categoryByes = []) {
  // Separar as federações escolhidas para passar de BYE (respeitando a ordem de seleção)
  const byeFeds = [];
  categoryByes.forEach(byeId => {
    const fed = federations.find(f => f.id === byeId);
    if (fed) byeFeds.push(fed);
  });

  // Quantidade de BYEs = 32 - N (onde N é o total de equipes participantes)
  const numByes = Math.max(0, 32 - federations.length);

  // Se faltarem BYEs para preencher a cota da categoria, completa automaticamente pelos melhores seeds
  if (byeFeds.length < numByes) {
    const sortedFeds = [...federations].sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      if (a.seed) return -1;
      if (b.seed) return 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    for (const fed of sortedFeds) {
      if (!byeFeds.some(f => f.id === fed.id)) {
        byeFeds.push(fed);
        if (byeFeds.length === numByes) break;
      }
    }
  }

  const byeSlots = STANDARD_BYE_SLOTS_32.slice(0, numByes);
  
  // Define os slots oponentes dos BYEs
  const byeOpponentSlots = byeSlots.map(s => s % 2 === 0 ? s + 1 : s - 1);

  const bracketSlots = Array(32).fill(null);
  
  // Posiciona os BYEs
  for (let i = 0; i < numByes; i++) {
    bracketSlots[byeSlots[i]] = { isBye: true, code: `B${i + 1}` };
  }

  // Posiciona SOMENTE os times escolhidos para passar de BYE contra os slots de BYE
  // Os demais slots ficam VAZIOS (null) para preenchimento manual pelo usuário
  for (let i = 0; i < numByes; i++) {
    const oppSlot = byeOpponentSlots[i];
    if (i < byeFeds.length) {
      bracketSlots[oppSlot] = byeFeds[i];
    }
    // Se não houver federação atribuída a este BYE, o slot oponente fica null (aguardando)
  }

  // Os demais slots (não-BYE) ficam TODOS como null para preenchimento manual

  const games = [];

  // ==========================================
  // 1. CHAVE PRINCIPAL (C1 até C32)
  // ==========================================

  // 1ª FASE (Round of 32) -> 16 confrontos (C1 a C16)
  for (let i = 0; i < 16; i++) {
    const slotA = bracketSlots[i * 2];
    const slotB = bracketSlots[i * 2 + 1];
    const matchNum = i + 1;
    const gameId = `g_main_r32_${matchNum}`;
    const code = `C${matchNum}`;

    const isByeA = slotA?.isBye;
    const isByeB = slotB?.isBye;
    const hasBye = isByeA || isByeB;

    // Próximo jogo: Oitavas (C17 a C24)
    const nextGameNum = 17 + Math.floor(i / 2);
    const nextSlot = i % 2 === 0 ? 'A' : 'B';
    let revGameNum = 1 + Math.floor(i / 2);
    let revSlot = i % 2 === 0 ? 'A' : 'B';

    // Regra específica: No confronto R17_3 o primeiro estado é o perdedor de C7 (que vinha para R17_4),
    // e o perdedor de C5 (BYE) vai para R17_4, fazendo o perdedor de C8 ficar de BYE (em categorias com 27 estados).
    if (numByes === 5) {
      if (i === 4) { // C5
        revGameNum = 4;
        revSlot = 'A';
      } else if (i === 6) { // C7
        revGameNum = 3;
        revSlot = 'A';
      }
    }

    const game = {
      id: gameId,
      code: code,
      categoria_id: categoryId,
      bracket: 'principal',
      fase: '1ª Fase',
      descricao: `1ª Fase (${matchNum})`,
      lado_a: isByeA ? null : slotA,
      lado_b: isByeB ? null : slotB,
      is_bye: hasBye,
      bye_slot: isByeA ? 'A' : (isByeB ? 'B' : null),
      status: hasBye ? 'encerrado' : 'aguardando',
      quadra_id: null,
      horario: null,
      resultado_jogo1: null,
      placar_jogo1: '',
      resultado_jogo2: null,
      placar_jogo2: '',
      resultado_jogo3: null,
      placar_jogo3: '',
      vitorias_a: 0,
      vitorias_b: 0,
      vencedor_id: hasBye ? (isByeA ? slotB?.id : slotA?.id) : null,
      perdedor_id: null,
      proxima_fase: `C${nextGameNum}`,
      proxima_fase_slot: nextSlot,
      proxima_fase_perdedor: `R17_${revGameNum}`,
      proxima_fase_perdedor_slot: revSlot
    };

    games.push(game);
  }

  // OITAVAS DE FINAL (C17 a C24) -> 8 confrontos
  for (let i = 0; i < 8; i++) {
    const matchNum = 17 + i;
    const gameId = `g_main_r16_${matchNum}`;
    const code = `C${matchNum}`;
    const nextGameNum = 25 + Math.floor(i / 2);
    const nextSlot = i % 2 === 0 ? 'A' : 'B';

    // Perdedores das Oitavas vão para a Chave Reversa 9º–16º (R9_1 a R9_4)
    const revMatchIndex = Math.floor(i / 2);
    const revCode = `R9_${revMatchIndex + 1}`;
    const revSlot = i % 2 === 0 ? 'A' : 'B';

    games.push({
      id: gameId,
      code: code,
      categoria_id: categoryId,
      bracket: 'principal',
      fase: 'Oitavas de Final',
      descricao: `Oitavas (${i + 1})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      status: 'aguardando',
      quadra_id: null,
      horario: null,
      resultado_jogo1: null,
      placar_jogo1: '',
      resultado_jogo2: null,
      placar_jogo2: '',
      resultado_jogo3: null,
      placar_jogo3: '',
      vitorias_a: 0,
      vitorias_b: 0,
      vencedor_id: null,
      perdedor_id: null,
      proxima_fase: `C${nextGameNum}`,
      proxima_fase_slot: nextSlot,
      proxima_fase_perdedor: revCode,
      proxima_fase_perdedor_slot: revSlot
    });
  }

  // QUARTAS DE FINAL (C25 a C28) -> 4 confrontos
  for (let i = 0; i < 4; i++) {
    const matchNum = 25 + i;
    const gameId = `g_main_qf_${matchNum}`;
    const code = `C${matchNum}`;
    const nextGameNum = 29 + Math.floor(i / 2);
    const nextSlot = i % 2 === 0 ? 'A' : 'B';

    // Perdedores das Quartas vão para Chave Reversa 5º–8º (R5_1 e R5_2)
    const revMatch = Math.floor(i / 2) + 1;
    const revSlot = i % 2 === 0 ? 'A' : 'B';

    games.push({
      id: gameId,
      code: code,
      categoria_id: categoryId,
      bracket: 'principal',
      fase: 'Quartas de Final',
      descricao: `Quartas (${i + 1})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      status: 'aguardando',
      quadra_id: null,
      horario: null,
      resultado_jogo1: null,
      placar_jogo1: '',
      resultado_jogo2: null,
      placar_jogo2: '',
      resultado_jogo3: null,
      placar_jogo3: '',
      vitorias_a: 0,
      vitorias_b: 0,
      vencedor_id: null,
      perdedor_id: null,
      proxima_fase: `C${nextGameNum}`,
      proxima_fase_slot: nextSlot,
      proxima_fase_perdedor: `R5_${revMatch}`,
      proxima_fase_perdedor_slot: revSlot
    });
  }

  // SEMIFINAIS (C29 e C30)
  for (let i = 0; i < 2; i++) {
    const matchNum = 29 + i;
    const gameId = `g_main_sf_${matchNum}`;
    const code = `C${matchNum}`;
    const nextSlot = i === 0 ? 'A' : 'B';

    games.push({
      id: gameId,
      code: code,
      categoria_id: categoryId,
      bracket: 'principal',
      fase: 'Semifinal',
      descricao: `Semifinal ${i === 0 ? 'A' : 'B'}`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      status: 'aguardando',
      quadra_id: null,
      horario: null,
      resultado_jogo1: null,
      placar_jogo1: '',
      resultado_jogo2: null,
      placar_jogo2: '',
      resultado_jogo3: null,
      placar_jogo3: '',
      vitorias_a: 0,
      vitorias_b: 0,
      vencedor_id: null,
      perdedor_id: null,
      proxima_fase: 'C31', // Grande Final
      proxima_fase_slot: nextSlot,
      proxima_fase_perdedor: 'C32', // Disputa 3º Lugar
      proxima_fase_perdedor_slot: nextSlot
    });
  }

  // GRANDE FINAL (C31)
  games.push({
    id: 'g_main_final_31',
    code: 'C31',
    categoria_id: categoryId,
    bracket: 'principal',
    fase: 'Finais',
    descricao: 'Grande Final (1º e 2º Lugar)',
    lado_a: null,
    lado_b: null,
    is_bye: false,
    status: 'aguardando',
    quadra_id: null,
    horario: null,
    resultado_jogo1: null,
    placar_jogo1: '',
    resultado_jogo2: null,
    placar_jogo2: '',
    resultado_jogo3: null,
    placar_jogo3: '',
    vitorias_a: 0,
    vitorias_b: 0,
    vencedor_id: null,
    perdedor_id: null,
    proxima_fase: null,
    proxima_fase_slot: null,
    proxima_fase_perdedor: null,
    proxima_fase_perdedor_slot: null
  });

  // DISPUTA 3º LUGAR (C32)
  games.push({
    id: 'g_main_bronze_32',
    code: 'C32',
    categoria_id: categoryId,
    bracket: 'principal',
    fase: 'Finais',
    descricao: 'Disputa 3º e 4º Lugar',
    lado_a: null,
    lado_b: null,
    is_bye: false,
    status: 'aguardando',
    quadra_id: null,
    horario: null,
    resultado_jogo1: null,
    placar_jogo1: '',
    resultado_jogo2: null,
    placar_jogo2: '',
    resultado_jogo3: null,
    placar_jogo3: '',
    vitorias_a: 0,
    vitorias_b: 0,
    vencedor_id: null,
    perdedor_id: null,
    proxima_fase: null,
    proxima_fase_slot: null,
    proxima_fase_perdedor: null,
    proxima_fase_perdedor_slot: null
  });

  // ==========================================
  // 2. CHAVE REVERSA 5º–8º LUGAR (R5)
  // ==========================================
  games.push({
    id: 'g_rev_r5_1',
    code: 'R5_1',
    categoria_id: categoryId,
    bracket: 'reversa_5_8',
    fase: 'Semifinais (5º-8º)',
    descricao: 'Semifinal 5º-8º (A)',
    lado_a: null,
    lado_b: null,
    is_bye: false,
    status: 'aguardando',
    quadra_id: null,
    horario: null,
    resultado_jogo1: null,
    placar_jogo1: '',
    resultado_jogo2: null,
    placar_jogo2: '',
    resultado_jogo3: null,
    placar_jogo3: '',
    vitorias_a: 0,
    vitorias_b: 0,
    vencedor_id: null,
    perdedor_id: null,
    proxima_fase: 'R5_FINAL', // Final 5º lugar
    proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R5_7LUGAR', // Disputa 7º lugar
    proxima_fase_perdedor_slot: 'A'
  });

  games.push({
    id: 'g_rev_r5_2',
    code: 'R5_2',
    categoria_id: categoryId,
    bracket: 'reversa_5_8',
    fase: 'Semifinais (5º-8º)',
    descricao: 'Semifinal 5º-8º (B)',
    lado_a: null,
    lado_b: null,
    is_bye: false,
    status: 'aguardando',
    quadra_id: null,
    horario: null,
    resultado_jogo1: null,
    placar_jogo1: '',
    resultado_jogo2: null,
    placar_jogo2: '',
    resultado_jogo3: null,
    placar_jogo3: '',
    vitorias_a: 0,
    vitorias_b: 0,
    vencedor_id: null,
    perdedor_id: null,
    proxima_fase: 'R5_FINAL',
    proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R5_7LUGAR',
    proxima_fase_perdedor_slot: 'B'
  });

  games.push({
    id: 'g_rev_r5_final',
    code: 'R5_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_5_8',
    fase: 'Finais (5º-8º)',
    descricao: 'Disputa 5º Lugar',
    lado_a: null,
    lado_b: null,
    is_bye: false,
    status: 'aguardando',
    quadra_id: null,
    horario: null,
    resultado_jogo1: null,
    placar_jogo1: '',
    resultado_jogo2: null,
    placar_jogo2: '',
    resultado_jogo3: null,
    placar_jogo3: '',
    vitorias_a: 0,
    vitorias_b: 0,
    vencedor_id: null,
    perdedor_id: null,
    proxima_fase: null,
    proxima_fase_slot: null,
    proxima_fase_perdedor: null,
    proxima_fase_perdedor_slot: null
  });

  games.push({
    id: 'g_rev_r5_7',
    code: 'R5_7LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_5_8',
    fase: 'Finais (5º-8º)',
    descricao: 'Disputa 7º Lugar',
    lado_a: null,
    lado_b: null,
    is_bye: false,
    status: 'aguardando',
    quadra_id: null,
    horario: null,
    resultado_jogo1: null,
    placar_jogo1: '',
    resultado_jogo2: null,
    placar_jogo2: '',
    resultado_jogo3: null,
    placar_jogo3: '',
    vitorias_a: 0,
    vitorias_b: 0,
    vencedor_id: null,
    perdedor_id: null,
    proxima_fase: null,
    proxima_fase_slot: null,
    proxima_fase_perdedor: null,
    proxima_fase_perdedor_slot: null
  });

  // ==========================================
  // 3. CHAVE REVERSA 9º–16º LUGAR (R9)
  // ==========================================
  // R9_1 a R9_4 (Quartas Reversas para os 8 perdedores das Oitavas)
  for (let i = 1; i <= 4; i++) {
    games.push({
      id: `g_rev_r9_${i}`,
      code: `R9_${i}`,
      categoria_id: categoryId,
      bracket: 'reversa_9_16',
      fase: 'Quartas de Final (9º-16º)',
      descricao: `Quartas 9º-16º (${i})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      status: 'aguardando',
      quadra_id: null,
      horario: null,
      resultado_jogo1: null,
      placar_jogo1: '',
      resultado_jogo2: null,
      placar_jogo2: '',
      resultado_jogo3: null,
      placar_jogo3: '',
      vitorias_a: 0,
      vitorias_b: 0,
      vencedor_id: null,
      perdedor_id: null,
      proxima_fase: i <= 2 ? 'R9_SEMI_1' : 'R9_SEMI_2', // Vencedores disputam 9º-12º
      proxima_fase_slot: i % 2 === 1 ? 'A' : 'B',
      proxima_fase_perdedor: i <= 2 ? 'R13_SEMI_1' : 'R13_SEMI_2', // Perdedores disputam 13º-16º
      proxima_fase_perdedor_slot: i % 2 === 1 ? 'A' : 'B'
    });
  }

  // Semis e Finais 9º–12º
  games.push({
    id: 'g_rev_r9_s1',
    code: 'R9_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Semifinais (9º-16º)',
    descricao: 'Semifinal 9º-12º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R9_FINAL', proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R9_11LUGAR', proxima_fase_perdedor_slot: 'A'
  });
  games.push({
    id: 'g_rev_r9_s2',
    code: 'R9_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Semifinais (9º-16º)',
    descricao: 'Semifinal 9º-12º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R9_FINAL', proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R9_11LUGAR', proxima_fase_perdedor_slot: 'B'
  });
  games.push({
    id: 'g_rev_r9_final',
    code: 'R9_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Finais (9º-16º)',
    descricao: 'Disputa 9º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r9_11',
    code: 'R9_11LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Finais (9º-16º)',
    descricao: 'Disputa 11º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });

  // Semis e Finais 13º–16º
  games.push({
    id: 'g_rev_r13_s1',
    code: 'R13_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Semifinais (9º-16º)',
    descricao: 'Semifinal 13º-16º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R13_FINAL', proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R13_15LUGAR', proxima_fase_perdedor_slot: 'A'
  });
  games.push({
    id: 'g_rev_r13_s2',
    code: 'R13_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Semifinais (9º-16º)',
    descricao: 'Semifinal 13º-16º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R13_FINAL', proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R13_15LUGAR', proxima_fase_perdedor_slot: 'B'
  });
  games.push({
    id: 'g_rev_r13_final',
    code: 'R13_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Finais (9º-16º)',
    descricao: 'Disputa 13º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r13_15',
    code: 'R13_15LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_9_16',
    fase: 'Finais (9º-16º)',
    descricao: 'Disputa 15º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });

  // ==========================================
  // 4. CHAVE REVERSA 17º–24º LUGAR (R17)
  // ==========================================
  // 1ª Rodada: R17_1 a R17_8
  for (let i = 1; i <= 8; i++) {
    const qfNum = Math.floor((i - 1) / 2) + 1;
    const qfSlot = i % 2 === 1 ? 'A' : 'B';
    const loserQfNum = Math.floor((i - 1) / 2) + 1;
    const loserSlot = i % 2 === 1 ? 'A' : 'B';

    let r17ByeSlot = null;
    if (numByes === 5) {
      if (i === 1) r17ByeSlot = 'A';
      else if (i === 4) r17ByeSlot = 'A';
      else if (i === 5) r17ByeSlot = 'A';
      else if (i === 6) r17ByeSlot = 'B';
      else if (i === 8) r17ByeSlot = 'B';
    }

    games.push({
      id: `g_rev_r17_${i}`,
      code: `R17_${i}`,
      categoria_id: categoryId,
      bracket: 'reversa_17_24',
      fase: '1ª Rodada (17º-24º)',
      descricao: `1ª Rodada 17º-24º (${i})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      bye_slot: r17ByeSlot,
      status: 'aguardando',
      proxima_fase: `R17_Q${qfNum}`,
      proxima_fase_slot: qfSlot,
      proxima_fase_perdedor: `R25_Q${loserQfNum}`,
      proxima_fase_perdedor_slot: loserSlot
    });
  }

  // Quartas 17º-24º: R17_Q1 a R17_Q4
  for (let i = 1; i <= 4; i++) {
    games.push({
      id: `g_rev_r17_q${i}`,
      code: `R17_Q${i}`,
      categoria_id: categoryId,
      bracket: 'reversa_17_24',
      fase: 'Quartas de Final (17º-24º)',
      descricao: `Quartas 17º-24º (${i})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      status: 'aguardando',
      proxima_fase: i <= 2 ? 'R17_SEMI_1' : 'R17_SEMI_2',
      proxima_fase_slot: i % 2 === 1 ? 'A' : 'B',
      proxima_fase_perdedor: i <= 2 ? 'R21_SEMI_1' : 'R21_SEMI_2',
      proxima_fase_perdedor_slot: i % 2 === 1 ? 'A' : 'B'
    });
  }

  // ==========================================
  // 5. CHAVE REVERSA 25º–27º LUGAR (R25)
  // ==========================================
  // Quartas 25º-27º: R25_Q1 a R25_Q4
  for (let i = 1; i <= 4; i++) {
    let r25ByeSlot = null;
    if (numByes === 5) {
      if (i === 1) r25ByeSlot = 'A';
      else if (i === 2) r25ByeSlot = 'B';
      else if (i === 4) r25ByeSlot = 'B';
    }

    games.push({
      id: `g_rev_r25_q${i}`,
      code: `R25_Q${i}`,
      categoria_id: categoryId,
      bracket: 'reversa_25_27',
      fase: 'Quartas de Final (25º-27º)',
      descricao: `Quartas 25º-27º (${i})`,
      lado_a: null,
      lado_b: null,
      is_bye: (i === 3 && numByes === 5),
      bye_slot: r25ByeSlot,
      status: (i === 3 && numByes === 5) ? 'encerrado' : 'aguardando',
      proxima_fase: i <= 2 ? 'R25_SEMI_1' : 'R25_SEMI_2',
      proxima_fase_slot: i % 2 === 1 ? 'A' : 'B'
    });
  }

  // Semifinais 17º-20º e 21º-24º
  games.push({
    id: 'g_rev_r17_s1',
    code: 'R17_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Semifinais (17º-24º)',
    descricao: 'Semifinal 17º-20º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R17_FINAL', proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R17_19LUGAR', proxima_fase_perdedor_slot: 'A'
  });
  games.push({
    id: 'g_rev_r17_s2',
    code: 'R17_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Semifinais (17º-24º)',
    descricao: 'Semifinal 17º-20º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R17_FINAL', proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R17_19LUGAR', proxima_fase_perdedor_slot: 'B'
  });

  games.push({
    id: 'g_rev_r21_s1',
    code: 'R21_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Semifinais (17º-24º)',
    descricao: 'Semifinal 21º-24º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R21_FINAL', proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R21_23LUGAR', proxima_fase_perdedor_slot: 'A'
  });
  games.push({
    id: 'g_rev_r21_s2',
    code: 'R21_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Semifinais (17º-24º)',
    descricao: 'Semifinal 21º-24º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R21_FINAL', proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R21_23LUGAR', proxima_fase_perdedor_slot: 'B'
  });

  // Semifinais 25º-27º
  games.push({
    id: 'g_rev_r25_s1',
    code: 'R25_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_25_27',
    fase: 'Semifinais (25º-27º)',
    descricao: 'Semifinal 25º-27º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R25_FINAL', proxima_fase_slot: 'A'
  });
  games.push({
    id: 'g_rev_r25_s2',
    code: 'R25_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_25_27',
    fase: 'Semifinais (25º-27º)',
    descricao: 'Semifinal 25º-27º (B)',
    lado_a: null, lado_b: null,
    is_bye: false,
    bye_slot: numByes === 5 ? 'A' : null,
    status: 'aguardando',
    proxima_fase: 'R25_FINAL', proxima_fase_slot: 'B'
  });

  // Finais 17º a 24º
  games.push({
    id: 'g_rev_r17_final',
    code: 'R17_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Finais (17º ao 24º)',
    descricao: 'Disputa 17º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r17_19',
    code: 'R17_19LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Finais (17º ao 24º)',
    descricao: 'Disputa 19º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r21_final',
    code: 'R21_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Finais (17º ao 24º)',
    descricao: 'Disputa 21º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r21_23',
    code: 'R21_23LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_17_24',
    fase: 'Finais (17º ao 24º)',
    descricao: 'Disputa 23º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });

  // Final 25º Lugar (25º e 26º)
  games.push({
    id: 'g_rev_r25_final',
    code: 'R25_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_25_27',
    fase: 'Final (25º e 26º Lugar)',
    descricao: 'Disputa 25º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });

  // ==========================================
  // Propaga automaticamente os BYEs iniciais para as Oitavas!
  // ==========================================
  propagateAllByes(games);

  return games;
}

// Verifica se um determinado slot ('A' ou 'B') de um confronto é uma VAGA LIVRE (BYE)
export function isSlotVagaLivre(games, game, slot) {
  if (game.bye_slot === slot) return true;

  // 1. Na 1ª Fase (C1 a C16)
  if (game.fase === '1ª Fase') {
    if (game.is_bye) {
      if (slot === 'A') return !game.lado_a || game.bye_slot === 'A';
      if (slot === 'B') return !game.lado_b || game.bye_slot === 'B';
    }
    if (slot === 'A' && !game.lado_a && (game.is_bye || game.bye_slot === 'A')) return true;
    if (slot === 'B' && !game.lado_b && (game.is_bye || game.bye_slot === 'B')) return true;
    return false;
  }

  // 2. Nas demais fases (Oitavas, Quartas, Semis, Finais e Repescagens)
  // (a) Origem de perdedor (Chaves reversas / repescagem)
  const loserSources = games.filter(s => s.proxima_fase_perdedor === game.code);
  let matchLoser = loserSources.find(s => s.proxima_fase_perdedor_slot === slot);
  if (!matchLoser && loserSources.length > 0 && !loserSources.some(s => s.proxima_fase_perdedor_slot)) {
    const idx = slot === 'A' ? 0 : 1;
    matchLoser = loserSources[idx];
  }

  if (matchLoser) {
    // Se o jogo de origem encerrou como BYE ou já possui bye_slot, ele NÃO produz perdedor.
    // Logo, este slot que aguarda o perdedor é uma VAGA LIVRE (BYE)!
    if (matchLoser.is_bye || matchLoser.bye_slot) {
      return true;
    }
    return false;
  }

  // (b) Origem de vencedor
  const winnerSources = games.filter(s => s.proxima_fase === game.code);
  let matchWinner = winnerSources.find(s => s.proxima_fase_slot === slot);
  if (!matchWinner && winnerSources.length > 0 && !winnerSources.some(s => s.proxima_fase_slot)) {
    const idx = slot === 'A' ? 0 : 1;
    matchWinner = winnerSources[idx];
  }

  if (matchWinner) {
    // Se o jogo de origem foi um BYE vazio (sem nenhum participante), não há vencedor
    if (matchWinner.is_bye && !matchWinner.vencedor_id && !matchWinner.lado_a && !matchWinner.lado_b) {
      return true;
    }
    return false;
  }

  return false;
}

// Propaga vencedores de confrontos com VAGA LIVRE (BYE) automaticamente para a próxima fase em todo o grafo
export function propagateAllByes(games) {
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    // 1. Propaga os vencedores de confrontos para a sua próxima fase
    for (const g of games) {
      if (g.vencedor_id && g.proxima_fase) {
        const nextGame = games.find(tgt => tgt.code === g.proxima_fase);
        if (nextGame) {
          const winTeam = (g.lado_a?.id === g.vencedor_id) ? g.lado_a : g.lado_b;
          if (winTeam) {
            if (g.proxima_fase_slot === 'A') {
              if (nextGame.lado_a?.id !== winTeam.id) {
                nextGame.lado_a = winTeam;
                changed = true;
              }
            } else if (g.proxima_fase_slot === 'B') {
              if (nextGame.lado_b?.id !== winTeam.id) {
                nextGame.lado_b = winTeam;
                changed = true;
              }
            } else {
              if (!nextGame.lado_a) { nextGame.lado_a = winTeam; changed = true; }
              else if (!nextGame.lado_b && nextGame.lado_a.id !== winTeam.id) { nextGame.lado_b = winTeam; changed = true; }
            }
          }
        }
      }
    }

    // 2. Todo confronto que tiver uma vaga livre (BYE): a outra equipe passa direto para a próxima fase!
    for (const g of games) {
      // Confrontos reais já jogados e finalizados com placar não são sobrescritos
      if (g.status === 'encerrado' && !g.is_bye) {
        continue;
      }

      const slotAIsBye = isSlotVagaLivre(games, g, 'A');
      const slotBIsBye = isSlotVagaLivre(games, g, 'B');

      if (slotAIsBye && slotBIsBye) {
        // Ambas as vagas são livres (BYE duplo)
        if (!g.is_bye || g.status !== 'encerrado') {
          g.is_bye = true;
          g.status = 'encerrado';
          g.vencedor_id = null;
          g.perdedor_id = null;
          changed = true;
        }
      } else if (slotAIsBye) {
        if (g.bye_slot !== 'A') {
          g.bye_slot = 'A';
          changed = true;
        }
        if (g.lado_b) {
          // Vaga A é livre (BYE) -> Equipe B passa direto para a próxima fase!
          if (!g.is_bye || g.vencedor_id !== g.lado_b.id || g.status !== 'encerrado') {
            g.is_bye = true;
            g.bye_slot = 'A';
            g.status = 'encerrado';
            g.vencedor_id = g.lado_b.id;
            g.perdedor_id = null;
            g.vitorias_a = 0;
            g.vitorias_b = 0;
            g.placar_jogo1 = ''; g.resultado_jogo1 = null;
            g.placar_jogo2 = ''; g.resultado_jogo2 = null;
            g.placar_jogo3 = ''; g.resultado_jogo3 = null;
            changed = true;
          }
        }
      } else if (slotBIsBye) {
        if (g.bye_slot !== 'B') {
          g.bye_slot = 'B';
          changed = true;
        }
        if (g.lado_a) {
          // Vaga B é livre (BYE) -> Equipe A passa direto para a próxima fase!
          if (!g.is_bye || g.vencedor_id !== g.lado_a.id || g.status !== 'encerrado') {
            g.is_bye = true;
            g.bye_slot = 'B';
            g.status = 'encerrado';
            g.vencedor_id = g.lado_a.id;
            g.perdedor_id = null;
            g.vitorias_a = 0;
            g.vitorias_b = 0;
            g.placar_jogo1 = ''; g.resultado_jogo1 = null;
            g.placar_jogo2 = ''; g.resultado_jogo2 = null;
            g.placar_jogo3 = ''; g.resultado_jogo3 = null;
            changed = true;
          }
        }
      } else if (!slotAIsBye && !slotBIsBye) {
        // Confronto normal com duas equipes definidas
        if (g.lado_a && g.lado_b && g.status === 'aguardando') {
          g.status = 'em espera';
          changed = true;
        }
      }
    }
  }
}

// Atualiza individualmente um confronto da 1ª rodada (C1 a C16)
export function updateFirstRoundMatch(games, gameCode, teamA, teamB, isBye, byeSlot = 'B') {
  const game = games.find(g => g.code === gameCode);
  if (!game) return { success: false, message: `Jogo ${gameCode} não encontrado.` };

  // Se o confronto estiver marcado como BYE (ou uma equipe for 'BYE'), ele é BYE
  const isByeA = teamA?.id === 'bye' || teamA?.id === 'BYE';
  const isByeB = teamB?.id === 'bye' || teamB?.id === 'BYE';
  const isActuallyBye = Boolean(isBye || isByeA || isByeB);
  const effectiveByeSlot = (isByeB || (!teamB && isActuallyBye)) ? 'B' : ((isByeA || (!teamA && isActuallyBye)) ? 'A' : byeSlot);

  // Limpa propagação anterior no jogo destino caso não tenha sido jogado
  if (game.proxima_fase) {
    const nextGame = games.find(g => g.code === game.proxima_fase);
    if (nextGame && nextGame.status !== 'encerrado') {
      if (game.proxima_fase_slot === 'A') nextGame.lado_a = null;
      else if (game.proxima_fase_slot === 'B') nextGame.lado_b = null;
      if (nextGame.status === 'em espera') nextGame.status = 'aguardando';
    }
  }

  game.is_bye = isActuallyBye;
  game.bye_slot = isActuallyBye ? effectiveByeSlot : null;

  if (isActuallyBye) {
    // Confronto com BYE (vaga livre): quem tiver equipe definida passa direto como vencedor!
    if (effectiveByeSlot === 'B') {
      game.lado_a = teamA;
      game.lado_b = null;
      game.vencedor_id = teamA?.id || null;
    } else {
      game.lado_a = null;
      game.lado_b = teamB;
      game.vencedor_id = teamB?.id || null;
    }
    // Placar não recebe nenhum resultado quando passa de BYE
    game.vitorias_a = 0;
    game.vitorias_b = 0;
    game.resultado_jogo1 = null;
    game.placar_jogo1 = '';
    game.resultado_jogo2 = null;
    game.placar_jogo2 = '';
    game.resultado_jogo3 = null;
    game.placar_jogo3 = '';
    game.perdedor_id = null;
    game.status = game.vencedor_id ? 'encerrado' : 'aguardando';
  } else {
    // Confronto normal entre duas equipes
    game.lado_a = teamA;
    game.lado_b = teamB;
    game.vencedor_id = null;
    game.perdedor_id = null;
    game.vitorias_a = 0;
    game.vitorias_b = 0;
    game.resultado_jogo1 = null;
    game.placar_jogo1 = '';
    game.resultado_jogo2 = null;
    game.placar_jogo2 = '';
    game.resultado_jogo3 = null;
    game.placar_jogo3 = '';
    game.status = (teamA && teamB) ? 'em espera' : 'aguardando';
  }

  // Propaga todos os BYEs para todo o chaveamento
  propagateAllByes(games);

  return { success: true, game };
}

// Propagador do Grafo de Jogos: atualiza vencedor e perdedor
export function propagateMatchResult(games, gameCode, resultData) {
  const game = games.find(g => g.code === gameCode);
  if (!game) return { success: false, message: `Jogo ${gameCode} não encontrado.` };

  // Copia o estado anterior para suporte a UNDO
  const previousState = JSON.parse(JSON.stringify(game));

  // Atualiza placares individuais e parciais
  game.resultado_jogo1 = resultData.resultado_jogo1 || null;
  game.placar_jogo1 = resultData.placar_jogo1 || '';
  game.resultado_jogo2 = resultData.resultado_jogo2 || null;
  game.placar_jogo2 = resultData.placar_jogo2 || '';
  game.resultado_jogo3 = resultData.resultado_jogo3 || null;
  game.placar_jogo3 = resultData.placar_jogo3 || '';

  // Contagem de vitórias na série Melhor de 3
  let vitoriasA = 0;
  let vitoriasB = 0;

  if (game.resultado_jogo1 === 'a') vitoriasA++;
  else if (game.resultado_jogo1 === 'b') vitoriasB++;

  if (game.resultado_jogo2 === 'a') vitoriasA++;
  else if (game.resultado_jogo2 === 'b') vitoriasB++;

  if (game.resultado_jogo3 === 'a') vitoriasA++;
  else if (game.resultado_jogo3 === 'b') vitoriasB++;

  game.vitorias_a = vitoriasA;
  game.vitorias_b = vitoriasB;

  let winnerPropagated = null;
  let loserPropagated = null;

  // Se uma equipe atingiu 2 vitórias, o confronto está encerrado!
  if (vitoriasA >= 2 || vitoriasB >= 2) {
    const isWinnerA = vitoriasA >= 2;
    const winnerTeam = isWinnerA ? game.lado_a : game.lado_b;
    const loserTeam = isWinnerA ? game.lado_b : game.lado_a;

    game.vencedor_id = winnerTeam?.id || null;
    game.perdedor_id = loserTeam?.id || null;
    game.status = 'encerrado';

    // 1. Propagação do Vencedor no Grafo
    if (game.proxima_fase && winnerTeam) {
      const nextGame = games.find(g => g.code === game.proxima_fase);
      if (nextGame) {
        if (game.proxima_fase_slot === 'A') {
          nextGame.lado_a = winnerTeam;
        } else {
          nextGame.lado_b = winnerTeam;
        }

        if (nextGame.lado_a && nextGame.lado_b && nextGame.status === 'aguardando') {
          nextGame.status = 'em espera';
        }
        winnerPropagated = {
          code: nextGame.code,
          fase: nextGame.fase,
          team: winnerTeam.nome
        };
      }
    }

    // 2. Propagação do Perdedor para Chave Reversa no Grafo
    if (game.proxima_fase_perdedor && loserTeam) {
      const revGame = games.find(g => g.code === game.proxima_fase_perdedor);
      if (revGame) {
        if (game.proxima_fase_perdedor_slot === 'A') {
          revGame.lado_a = loserTeam;
        } else {
          revGame.lado_b = loserTeam;
        }

        if (revGame.lado_a && revGame.lado_b && revGame.status === 'aguardando') {
          revGame.status = 'em espera';
        }
        loserPropagated = {
          code: revGame.code,
          fase: revGame.fase,
          team: loserTeam.nome
        };
      }
    }
  } else {
    // Confronto ainda não decidido (ex.: 1x0, 0x1 ou 1x1 aguardando Jogo 3)
    game.vencedor_id = null;
    game.perdedor_id = null;
    if (resultData.status) {
      game.status = resultData.status;
    } else {
      game.status = (vitoriasA > 0 || vitoriasB > 0) ? 'em andamento' : 'em espera';
    }
  }

  // Propaga todos os BYEs para avançar equipes que enfrentem vaga livre no destino
  propagateAllByes(games);

  return {
    success: true,
    game: game,
    winnerPropagated,
    loserPropagated,
    previousState
  };
}

// Desfazer (UNDO) do resultado de um confronto
export function revertMatchResult(games, gameCode, previousState) {
  const game = games.find(g => g.code === gameCode);
  if (!game) return { success: false, message: 'Jogo não encontrado' };

  const currentWinnerId = game.vencedor_id;
  const currentLoserId = game.perdedor_id;

  // Se já havia propagado vencedor, remove do jogo destino (apenas se aquele jogo ainda não encerrou)
  if (currentWinnerId && game.proxima_fase) {
    const nextGame = games.find(g => g.code === game.proxima_fase);
    if (nextGame && nextGame.status !== 'encerrado') {
      if (game.proxima_fase_slot === 'A' && nextGame.lado_a?.id === currentWinnerId) {
        nextGame.lado_a = null;
      } else if (game.proxima_fase_slot === 'B' && nextGame.lado_b?.id === currentWinnerId) {
        nextGame.lado_b = null;
      }
      if (nextGame.status === 'em espera') nextGame.status = 'aguardando';
    }
  }

  // Se já havia propagado perdedor para chave reversa, remove também
  if (currentLoserId && game.proxima_fase_perdedor) {
    const revGame = games.find(g => g.code === game.proxima_fase_perdedor);
    if (revGame && revGame.status !== 'encerrado') {
      if (game.proxima_fase_perdedor_slot === 'A' && revGame.lado_a?.id === currentLoserId) {
        revGame.lado_a = null;
      } else if (game.proxima_fase_perdedor_slot === 'B' && revGame.lado_b?.id === currentLoserId) {
        revGame.lado_b = null;
      }
      if (revGame.status === 'em espera') revGame.status = 'aguardando';
    }
  }

  // Restaura dados do jogo
  if (previousState) {
    Object.assign(game, previousState);
  } else {
    game.resultado_jogo1 = null;
    game.placar_jogo1 = '';
    game.resultado_jogo2 = null;
    game.placar_jogo2 = '';
    game.resultado_jogo3 = null;
    game.vitorias_a = 0;
    game.vitorias_b = 0;
    game.vencedor_id = null;
    game.perdedor_id = null;
    game.status = (game.lado_a && game.lado_b) ? 'em espera' : 'aguardando';
  }

  propagateAllByes(games);

  return { success: true, game };
}

// Calcula classificação e pontuação progressiva da categoria conforme os estados passam de fase
export function calculateCategoryPlacements(games, pointsTable = {}, participatingFeds = []) {
  const teamMap = new Map(); // teamId -> { team, pontos, faseAtual, colocacao, prioridade }

  // Função auxiliar para registrar ou subir a pontuação de uma equipe
  function registerPoints(team, points, faseName, colocacaoVal, prioridade) {
    if (!team || !team.id) return;
    const existing = teamMap.get(team.id);
    if (!existing || points > existing.pontos || (points === existing.pontos && prioridade > existing.prioridade)) {
      teamMap.set(team.id, {
        equipe_id: team.id,
        nome: team.nome,
        sigla: team.sigla,
        uf: team.uf,
        pontos: points,
        faseAtual: faseName,
        colocacao: colocacaoVal,
        prioridade: prioridade
      });
    }
  }

  // 1. Equipes participantes iniciam com pontuação base de participação (1 ponto CBT)
  participatingFeds.forEach(fed => {
    registerPoints(fed, pointsTable[27] || 1, '1ª Fase', 27, 1);
  });

  // Também garante federações presentes nos jogos
  games.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[27] || 1, '1ª Fase', 27, 1);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[27] || 1, '1ª Fase', 27, 1);
  });

  // 2. Pontuação por avanço na Chave Principal (jogos que passam de BYE pontuam antecipadamente conforme as fases que avançam):
  
  // (a) Oitavas de Final (Top 16) - Garantido pelo menos 16º lugar (12 pts CBT)
  const oitavasGames = games.filter(g => g.fase === 'Oitavas de Final');
  oitavasGames.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[16] || 12, 'Oitavas de Final (Top 16)', 16, 2);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[16] || 12, 'Oitavas de Final (Top 16)', 16, 2);
  });

  // (b) Quartas de Final (Top 8) - Garantido pelo menos 8º lugar (26 pts CBT)
  const quartasGames = games.filter(g => g.fase === 'Quartas de Final');
  quartasGames.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[8] || 26, 'Quartas de Final (Top 8)', 8, 3);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[8] || 26, 'Quartas de Final (Top 8)', 8, 3);
  });

  // (c) Semifinais (Top 4) - Garantido pelo menos 4º lugar (40 pts CBT)
  const semisGames = games.filter(g => g.fase === 'Semifinal');
  semisGames.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[4] || 40, 'Semifinalista (Top 4)', 4, 4);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[4] || 40, 'Semifinalista (Top 4)', 4, 4);
  });

  // (d) Finalista (Top 2) - Garantido pelo menos 2º lugar (50 pts CBT)
  const finalGame = games.find(g => g.code === 'C31');
  if (finalGame) {
    if (finalGame.lado_a) registerPoints(finalGame.lado_a, pointsTable[2] || 50, 'Finalista (Top 2)', 2, 5);
    if (finalGame.lado_b) registerPoints(finalGame.lado_b, pointsTable[2] || 50, 'Finalista (Top 2)', 2, 5);

    if (finalGame.status === 'encerrado' && finalGame.vencedor_id) {
      const winner = finalGame.lado_a?.id === finalGame.vencedor_id ? finalGame.lado_a : finalGame.lado_b;
      const runnerUp = finalGame.lado_a?.id === finalGame.vencedor_id ? finalGame.lado_b : finalGame.lado_a;
      if (winner) registerPoints(winner, pointsTable[1] || 55, '1º Lugar (Campeão 🥇)', 1, 10);
      if (runnerUp) registerPoints(runnerUp, pointsTable[2] || 50, '2º Lugar (Vice-Campeão 🥈)', 2, 9);
    }
  }

  // (f) Disputa de 3º Lugar (C32)
  const bronzeGame = games.find(g => g.code === 'C32');
  if (bronzeGame && bronzeGame.status === 'encerrado' && bronzeGame.vencedor_id) {
    const bronze = bronzeGame.lado_a?.id === bronzeGame.vencedor_id ? bronzeGame.lado_a : bronzeGame.lado_b;
    const fourth = bronzeGame.lado_a?.id === bronzeGame.vencedor_id ? bronzeGame.lado_b : bronzeGame.lado_a;
    if (bronze) registerPoints(bronze, pointsTable[3] || 45, '3º Lugar (Bronze 🥉)', 3, 8);
    if (fourth) registerPoints(fourth, pointsTable[4] || 40, '4º Lugar', 4, 7);
  }

  // 3. Chave Reversa 5º–8º Lugar
  const r5Final = games.find(g => g.code === 'R5_FINAL');
  if (r5Final && r5Final.status === 'encerrado' && r5Final.vencedor_id) {
    const winner = r5Final.lado_a?.id === r5Final.vencedor_id ? r5Final.lado_a : r5Final.lado_b;
    const loser = r5Final.lado_a?.id === r5Final.vencedor_id ? r5Final.lado_b : r5Final.lado_a;
    registerPoints(winner, pointsTable[5] || 36, '5º Lugar', 5, 8);
    registerPoints(loser, pointsTable[6] || 32, '6º Lugar', 6, 7);
  }

  const r5Seventh = games.find(g => g.code === 'R5_7LUGAR');
  if (r5Seventh && r5Seventh.status === 'encerrado' && r5Seventh.vencedor_id) {
    const winner = r5Seventh.lado_a?.id === r5Seventh.vencedor_id ? r5Seventh.lado_a : r5Seventh.lado_b;
    const loser = r5Seventh.lado_a?.id === r5Seventh.vencedor_id ? r5Seventh.lado_b : r5Seventh.lado_a;
    registerPoints(winner, pointsTable[7] || 29, '7º Lugar', 7, 8);
    registerPoints(loser, pointsTable[8] || 26, '8º Lugar', 8, 7);
  }

  // 4. Chave Reversa 9º–16º Lugar
  const r9Final = games.find(g => g.code === 'R9_FINAL');
  if (r9Final && r9Final.status === 'encerrado' && r9Final.vencedor_id) {
    const winner = r9Final.lado_a?.id === r9Final.vencedor_id ? r9Final.lado_a : r9Final.lado_b;
    const loser = r9Final.lado_a?.id === r9Final.vencedor_id ? r9Final.lado_b : r9Final.lado_a;
    registerPoints(winner, pointsTable[9] || 23, '9º Lugar', 9, 8);
    registerPoints(loser, pointsTable[10] || 21, '10º Lugar', 10, 7);
  }

  const r9Eleventh = games.find(g => g.code === 'R9_11LUGAR');
  if (r9Eleventh && r9Eleventh.status === 'encerrado' && r9Eleventh.vencedor_id) {
    const winner = r9Eleventh.lado_a?.id === r9Eleventh.vencedor_id ? r9Eleventh.lado_a : r9Eleventh.lado_b;
    const loser = r9Eleventh.lado_a?.id === r9Eleventh.vencedor_id ? r9Eleventh.lado_b : r9Eleventh.lado_a;
    registerPoints(winner, pointsTable[11] || 19, '11º Lugar', 11, 8);
    registerPoints(loser, pointsTable[12] || 17, '12º Lugar', 12, 7);
  }

  const r13Final = games.find(g => g.code === 'R13_FINAL');
  if (r13Final && r13Final.status === 'encerrado' && r13Final.vencedor_id) {
    const winner = r13Final.lado_a?.id === r13Final.vencedor_id ? r13Final.lado_a : r13Final.lado_b;
    const loser = r13Final.lado_a?.id === r13Final.vencedor_id ? r13Final.lado_b : r13Final.lado_a;
    registerPoints(winner, pointsTable[13] || 15, '13º Lugar', 13, 8);
    registerPoints(loser, pointsTable[14] || 14, '14º Lugar', 14, 7);
  }

  const r13Fifteenth = games.find(g => g.code === 'R13_15LUGAR');
  if (r13Fifteenth && r13Fifteenth.status === 'encerrado' && r13Fifteenth.vencedor_id) {
    const winner = r13Fifteenth.lado_a?.id === r13Fifteenth.vencedor_id ? r13Fifteenth.lado_a : r13Fifteenth.lado_b;
    const loser = r13Fifteenth.lado_a?.id === r13Fifteenth.vencedor_id ? r13Fifteenth.lado_b : r13Fifteenth.lado_a;
    registerPoints(winner, pointsTable[15] || 13, '15º Lugar', 15, 8);
    registerPoints(loser, pointsTable[16] || 12, '16º Lugar', 16, 7);
  }

  // 5. Chave Reversa 17º–27º Lugar
  const r17Final = games.find(g => g.code === 'R17_FINAL');
  if (r17Final && r17Final.status === 'encerrado' && r17Final.vencedor_id) {
    const winner = r17Final.lado_a?.id === r17Final.vencedor_id ? r17Final.lado_a : r17Final.lado_b;
    const loser = r17Final.lado_a?.id === r17Final.vencedor_id ? r17Final.lado_b : r17Final.lado_a;
    registerPoints(winner, pointsTable[17] || 11, '17º Lugar', 17, 8);
    registerPoints(loser, pointsTable[18] || 10, '18º Lugar', 18, 7);
  }

  const r17Nineteenth = games.find(g => g.code === 'R17_19LUGAR');
  if (r17Nineteenth && r17Nineteenth.status === 'encerrado' && r17Nineteenth.vencedor_id) {
    const winner = r17Nineteenth.lado_a?.id === r17Nineteenth.vencedor_id ? r17Nineteenth.lado_a : r17Nineteenth.lado_b;
    const loser = r17Nineteenth.lado_a?.id === r17Nineteenth.vencedor_id ? r17Nineteenth.lado_b : r17Nineteenth.lado_a;
    registerPoints(winner, pointsTable[19] || 9, '19º Lugar', 19, 8);
    registerPoints(loser, pointsTable[20] || 8, '20º Lugar', 20, 7);
  }

  const r21Final = games.find(g => g.code === 'R21_FINAL');
  if (r21Final && r21Final.status === 'encerrado' && r21Final.vencedor_id) {
    const winner = r21Final.lado_a?.id === r21Final.vencedor_id ? r21Final.lado_a : r21Final.lado_b;
    const loser = r21Final.lado_a?.id === r21Final.vencedor_id ? r21Final.lado_b : r21Final.lado_a;
    registerPoints(winner, pointsTable[21] || 7, '21º Lugar', 21, 8);
    registerPoints(loser, pointsTable[22] || 6, '22º Lugar', 22, 7);
  }

  const r21Third = games.find(g => g.code === 'R21_23LUGAR');
  if (r21Third && r21Third.status === 'encerrado' && r21Third.vencedor_id) {
    const winner = r21Third.lado_a?.id === r21Third.vencedor_id ? r21Third.lado_a : r21Third.lado_b;
    const loser = r21Third.lado_a?.id === r21Third.vencedor_id ? r21Third.lado_b : r21Third.lado_a;
    registerPoints(winner, pointsTable[23] || 5, '23º Lugar', 23, 8);
    registerPoints(loser, pointsTable[24] || 4, '24º Lugar', 24, 7);
  }

  const r25Final = games.find(g => g.code === 'R25_FINAL');
  if (r25Final && r25Final.status === 'encerrado' && r25Final.vencedor_id) {
    const winner = r25Final.lado_a?.id === r25Final.vencedor_id ? r25Final.lado_a : r25Final.lado_b;
    const loser = r25Final.lado_a?.id === r25Final.vencedor_id ? r25Final.lado_b : r25Final.lado_a;
    registerPoints(winner, pointsTable[25] || 3, '25º Lugar', 25, 8);
    registerPoints(loser, pointsTable[26] || 2, '26º Lugar', 26, 7);
  }

  const r25Semi1 = games.find(g => g.code === 'R25_SEMI_1');
  if (r25Semi1 && r25Semi1.status === 'encerrado' && r25Semi1.vencedor_id) {
    const loser = r25Semi1.lado_a?.id === r25Semi1.vencedor_id ? r25Semi1.lado_b : r25Semi1.lado_a;
    if (loser) registerPoints(loser, pointsTable[27] || 1, '27º Lugar', 27, 8);
  }

  const r25Semi2 = games.find(g => g.code === 'R25_SEMI_2');
  if (r25Semi2 && r25Semi2.status === 'encerrado' && r25Semi2.vencedor_id) {
    const loser = r25Semi2.lado_a?.id === r25Semi2.vencedor_id ? r25Semi2.lado_b : r25Semi2.lado_a;
    if (loser) registerPoints(loser, pointsTable[27] || 1, '27º Lugar', 27, 8);
  }

  // Converte Map para Array e ordena por pontos decrescente, prioridade de colocação e seed oficial CBT
  const list = Array.from(teamMap.values());
  list.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (a.colocacao !== b.colocacao) return a.colocacao - b.colocacao;
    const fedA = participatingFeds.find(f => f.id === a.equipe_id);
    const fedB = participatingFeds.find(f => f.id === b.equipe_id);
    const seedA = fedA?.seed || 99;
    const seedB = fedB?.seed || 99;
    if (seedA !== seedB) return seedA - seedB;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });

  list.forEach((item, idx) => {
    item.posicao = idx + 1;
  });

  return list;
}
