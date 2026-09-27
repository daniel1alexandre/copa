// Posições estratégicas de BYEs para garantir os quadrantes: Top (1, 3, 6), Bottom (5, 4, 2)
const STANDARD_BYE_SLOTS_32 = [1, 30, 9, 22, 17, 14, 25, 6, 19, 11, 27, 3, 29, 5, 21, 13];

export function createGraphBracket(federations, categoryId, categoryByes = []) {
  // Separar as federações escolhidas para passar de BYE (respeitando a ordem de seleção)
  const byeFeds = [];
  categoryByes.forEach(byeId => {
    const fed = federations.find(f => f.id === byeId);
    if (fed) byeFeds.push(fed);
  });
  
  const otherFeds = federations.filter(f => !categoryByes.includes(f.id));

  // Ordena o restante por seed e alfabeticamente
  const sortedFeds = [...otherFeds].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return a.nome.localeCompare(b.nome);
  });

  // Quantidade de BYEs = 32 - N (onde N é o total de equipes participantes)
  const numByes = Math.max(0, 32 - federations.length);
  const byeSlots = STANDARD_BYE_SLOTS_32.slice(0, numByes);
  
  // Define os slots oponentes dos BYEs
  const byeOpponentSlots = byeSlots.map(s => s % 2 === 0 ? s + 1 : s - 1);

  const bracketSlots = Array(32).fill(null);
  
  // Posiciona os BYEs
  for (let i = 0; i < numByes; i++) {
    bracketSlots[byeSlots[i]] = { isBye: true, code: `B${i + 1}` };
  }

  // Posiciona os times escolhidos para passar de BYE contra os slots de BYE
  let byeFedIndex = 0;
  for (let i = 0; i < numByes; i++) {
    const oppSlot = byeOpponentSlots[i];
    if (byeFedIndex < byeFeds.length) {
      bracketSlots[oppSlot] = byeFeds[byeFedIndex];
      byeFedIndex++;
    } else {
      bracketSlots[oppSlot] = sortedFeds.shift() || null;
    }
  }

  // Preenche o restante dos slots vazios com o que sobrou
  let fedIndex = 0;
  for (let i = 0; i < 32; i++) {
    if (bracketSlots[i] === null) {
      bracketSlots[i] = sortedFeds[fedIndex] || null;
      fedIndex++;
    }
  }

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
    const revGameNum = 1 + Math.floor(i / 2);
    const revSlot = i % 2 === 0 ? 'A' : 'B';

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
  // 4. CHAVE REVERSA 17º–27º LUGAR (R17)
  // ==========================================
  // 1ª Rodada: R17_1 a R17_8
  for (let i = 1; i <= 8; i++) {
    const qfNum = Math.floor((i - 1) / 2) + 1;
    const qfSlot = i % 2 === 1 ? 'A' : 'B';
    const loserQfNum = Math.floor((i - 1) / 2) + 1;
    const loserSlot = i % 2 === 1 ? 'A' : 'B';

    games.push({
      id: `g_rev_r17_${i}`,
      code: `R17_${i}`,
      categoria_id: categoryId,
      bracket: 'reversa_17_27',
      fase: '1ª Rodada (17º-27º)',
      descricao: `1ª Rodada 17º-27º (${i})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
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
      bracket: 'reversa_17_27',
      fase: 'Quartas de Final (17º-27º)',
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

  // Quartas 25º-27º: R25_Q1 a R25_Q4
  for (let i = 1; i <= 4; i++) {
    games.push({
      id: `g_rev_r25_q${i}`,
      code: `R25_Q${i}`,
      categoria_id: categoryId,
      bracket: 'reversa_17_27',
      fase: 'Quartas de Final (17º-27º)',
      descricao: `Quartas 25º-27º (${i})`,
      lado_a: null,
      lado_b: null,
      is_bye: false,
      status: 'aguardando',
      proxima_fase: i <= 2 ? 'R25_SEMI_1' : 'R25_SEMI_2',
      proxima_fase_slot: i % 2 === 1 ? 'A' : 'B'
    });
  }

  // Semifinais 17º-20º, 21º-24º, 25º-27º
  games.push({
    id: 'g_rev_r17_s1',
    code: 'R17_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Semifinais (17º-27º)',
    descricao: 'Semifinal 17º-20º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R17_FINAL', proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R17_19LUGAR', proxima_fase_perdedor_slot: 'A'
  });
  games.push({
    id: 'g_rev_r17_s2',
    code: 'R17_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Semifinais (17º-27º)',
    descricao: 'Semifinal 17º-20º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R17_FINAL', proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R17_19LUGAR', proxima_fase_perdedor_slot: 'B'
  });

  games.push({
    id: 'g_rev_r21_s1',
    code: 'R21_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Semifinais (17º-27º)',
    descricao: 'Semifinal 21º-24º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R21_FINAL', proxima_fase_slot: 'A',
    proxima_fase_perdedor: 'R21_23LUGAR', proxima_fase_perdedor_slot: 'A'
  });
  games.push({
    id: 'g_rev_r21_s2',
    code: 'R21_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Semifinais (17º-27º)',
    descricao: 'Semifinal 21º-24º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R21_FINAL', proxima_fase_slot: 'B',
    proxima_fase_perdedor: 'R21_23LUGAR', proxima_fase_perdedor_slot: 'B'
  });

  games.push({
    id: 'g_rev_r25_s1',
    code: 'R25_SEMI_1',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Semifinais (17º-27º)',
    descricao: 'Semifinal 25º-27º (A)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R25_FINAL', proxima_fase_slot: 'A'
  });
  games.push({
    id: 'g_rev_r25_s2',
    code: 'R25_SEMI_2',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Semifinais (17º-27º)',
    descricao: 'Semifinal 25º-27º (B)',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando',
    proxima_fase: 'R25_FINAL', proxima_fase_slot: 'B'
  });

  // Finais 17º a 27º
  games.push({
    id: 'g_rev_r17_final',
    code: 'R17_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Finais (17º-27º)',
    descricao: 'Disputa 17º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r17_19',
    code: 'R17_19LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Finais (17º-27º)',
    descricao: 'Disputa 19º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r21_final',
    code: 'R21_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Finais (17º-27º)',
    descricao: 'Disputa 21º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r21_23',
    code: 'R21_23LUGAR',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Finais (17º-27º)',
    descricao: 'Disputa 23º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });
  games.push({
    id: 'g_rev_r25_final',
    code: 'R25_FINAL',
    categoria_id: categoryId,
    bracket: 'reversa_17_27',
    fase: 'Finais (17º-27º)',
    descricao: 'Disputa 25º Lugar',
    lado_a: null, lado_b: null, is_bye: false, status: 'aguardando'
  });

  // ==========================================
  // Propaga automaticamente os BYEs iniciais para as Oitavas!
  // ==========================================
  propagateAllByes(games);

  return games;
}

// Propaga vencedores de jogos BYE diretamente para o próximo jogo
export function propagateAllByes(games) {
  // Limpa primeiro os slots das Oitavas que dependem de BYEs antigos caso tenham mudado
  games.filter(g => g.fase === 'Oitavas de Final' && g.status !== 'encerrado').forEach(oitava => {
    // Será preenchido novamente abaixo
  });

  const byeGames = games.filter(g => g.fase === '1ª Fase' && g.is_bye && g.vencedor_id);
  byeGames.forEach(bg => {
    if (bg.proxima_fase) {
      const target = games.find(g => g.code === bg.proxima_fase);
      if (target) {
        const winningTeam = bg.lado_a?.id === bg.vencedor_id ? bg.lado_a : bg.lado_b;
        if (bg.proxima_fase_slot === 'A') target.lado_a = winningTeam;
        else if (bg.proxima_fase_slot === 'B') target.lado_b = winningTeam;

        // Se ambos lados estiverem preenchidos no jogo alvo, status passa a 'em espera' se estiver 'aguardando'
        if (target.lado_a && target.lado_b && target.status === 'aguardando') {
          target.status = 'em espera';
        }
      }
    }
  });
}

// Atualiza individualmente um confronto da 1ª rodada (C1 a C16)
export function updateFirstRoundMatch(games, gameCode, teamA, teamB, isBye, byeSlot = 'B') {
  const game = games.find(g => g.code === gameCode);
  if (!game) return { success: false, message: `Jogo ${gameCode} não encontrado.` };

  // Limpa propagação anterior no jogo destino caso não tenha sido jogado
  if (game.proxima_fase) {
    const nextGame = games.find(g => g.code === game.proxima_fase);
    if (nextGame && nextGame.status !== 'encerrado') {
      if (game.proxima_fase_slot === 'A') nextGame.lado_a = null;
      else if (game.proxima_fase_slot === 'B') nextGame.lado_b = null;
      if (nextGame.status === 'em espera') nextGame.status = 'aguardando';
    }
  }

  game.is_bye = Boolean(isBye);
  game.bye_slot = isBye ? byeSlot : null;

  if (isBye) {
    // Confronto com BYE (vaga livre)
    if (byeSlot === 'B') {
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

  // Re-propaga os BYEs para as Oitavas de Final
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
    game.placar_jogo3 = '';
    game.vitorias_a = 0;
    game.vitorias_b = 0;
    game.vencedor_id = null;
    game.perdedor_id = null;
    game.status = (game.lado_a && game.lado_b) ? 'em espera' : 'aguardando';
  }

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

  // 1. Equipes participantes iniciam com pontuação base de participação (1 ponto)
  participatingFeds.forEach(fed => {
    registerPoints(fed, pointsTable[27] || 1, '1ª Fase', 27, 1);
  });

  // Também garante federações presentes nos jogos
  games.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[27] || 1, '1ª Fase', 27, 1);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[27] || 1, '1ª Fase', 27, 1);
  });

  // 2. Pontuação por avanço na Chave Principal:
  // (a) Oitavas de Final (Top 16) - Garantido pelo menos 16º lugar (10 pts)
  const oitavasGames = games.filter(g => g.fase === 'Oitavas de Final');
  oitavasGames.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[16] || 10, 'Oitavas de Final (Top 16)', 16, 2);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[16] || 10, 'Oitavas de Final (Top 16)', 16, 2);
  });

  // (b) Quartas de Final (Top 8) - Garantido pelo menos 8º lugar (27 pts)
  const quartasGames = games.filter(g => g.fase === 'Quartas de Final');
  quartasGames.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[8] || 27, 'Quartas de Final (Top 8)', 8, 3);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[8] || 27, 'Quartas de Final (Top 8)', 8, 3);
  });

  // (c) Semifinais (Top 4) - Garantido pelo menos 4º lugar (40 pts)
  const semisGames = games.filter(g => g.fase === 'Semifinal');
  semisGames.forEach(g => {
    if (g.lado_a) registerPoints(g.lado_a, pointsTable[4] || 40, 'Semifinalista (Top 4)', 4, 4);
    if (g.lado_b) registerPoints(g.lado_b, pointsTable[4] || 40, 'Semifinalista (Top 4)', 4, 4);
  });

  // (d) Grande Final (C31) - Garantido pelo menos 2º lugar (Vice-Campeão, 50 pts)
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

  // (e) Disputa de 3º Lugar (C32)
  const bronzeGame = games.find(g => g.code === 'C32');
  if (bronzeGame) {
    if (bronzeGame.lado_a) registerPoints(bronzeGame.lado_a, pointsTable[4] || 40, 'Disputa 3º Lugar', 4, 6);
    if (bronzeGame.lado_b) registerPoints(bronzeGame.lado_b, pointsTable[4] || 40, 'Disputa 3º Lugar', 4, 6);

    if (bronzeGame.status === 'encerrado' && bronzeGame.vencedor_id) {
      const bronze = bronzeGame.lado_a?.id === bronzeGame.vencedor_id ? bronzeGame.lado_a : bronzeGame.lado_b;
      const fourth = bronzeGame.lado_a?.id === bronzeGame.vencedor_id ? bronzeGame.lado_b : bronzeGame.lado_a;
      if (bronze) registerPoints(bronze, pointsTable[3] || 45, '3º Lugar (Bronze 🥉)', 3, 8);
      if (fourth) registerPoints(fourth, pointsTable[4] || 40, '4º Lugar', 4, 7);
    }
  }

  // 3. Chave Reversa 5º–8º Lugar
  const r5Final = games.find(g => g.code === 'R5_FINAL');
  if (r5Final) {
    if (r5Final.lado_a) registerPoints(r5Final.lado_a, pointsTable[6] || 33, 'Disputa 5º Lugar', 6, 6);
    if (r5Final.lado_b) registerPoints(r5Final.lado_b, pointsTable[6] || 33, 'Disputa 5º Lugar', 6, 6);
    if (r5Final.status === 'encerrado' && r5Final.vencedor_id) {
      const winner = r5Final.lado_a?.id === r5Final.vencedor_id ? r5Final.lado_a : r5Final.lado_b;
      const loser = r5Final.lado_a?.id === r5Final.vencedor_id ? r5Final.lado_b : r5Final.lado_a;
      registerPoints(winner, pointsTable[5] || 36, '5º Lugar', 5, 8);
      registerPoints(loser, pointsTable[6] || 33, '6º Lugar', 6, 7);
    }
  }

  const r5Seventh = games.find(g => g.code === 'R5_7LUGAR');
  if (r5Seventh) {
    if (r5Seventh.lado_a) registerPoints(r5Seventh.lado_a, pointsTable[8] || 27, 'Disputa 7º Lugar', 8, 6);
    if (r5Seventh.lado_b) registerPoints(r5Seventh.lado_b, pointsTable[8] || 27, 'Disputa 7º Lugar', 8, 6);
    if (r5Seventh.status === 'encerrado' && r5Seventh.vencedor_id) {
      const winner = r5Seventh.lado_a?.id === r5Seventh.vencedor_id ? r5Seventh.lado_a : r5Seventh.lado_b;
      const loser = r5Seventh.lado_a?.id === r5Seventh.vencedor_id ? r5Seventh.lado_b : r5Seventh.lado_a;
      registerPoints(winner, pointsTable[7] || 30, '7º Lugar', 7, 8);
      registerPoints(loser, pointsTable[8] || 27, '8º Lugar', 8, 7);
    }
  }

  // 4. Chave Reversa 9º–16º Lugar
  const r9Final = games.find(g => g.code === 'R9_FINAL');
  if (r9Final && r9Final.status === 'encerrado' && r9Final.vencedor_id) {
    const winner = r9Final.lado_a?.id === r9Final.vencedor_id ? r9Final.lado_a : r9Final.lado_b;
    const loser = r9Final.lado_a?.id === r9Final.vencedor_id ? r9Final.lado_b : r9Final.lado_a;
    registerPoints(winner, pointsTable[9] || 24, '9º Lugar', 9, 8);
    registerPoints(loser, pointsTable[10] || 22, '10º Lugar', 10, 7);
  }

  const r9Eleventh = games.find(g => g.code === 'R9_11LUGAR');
  if (r9Eleventh && r9Eleventh.status === 'encerrado' && r9Eleventh.vencedor_id) {
    const winner = r9Eleventh.lado_a?.id === r9Eleventh.vencedor_id ? r9Eleventh.lado_a : r9Eleventh.lado_b;
    const loser = r9Eleventh.lado_a?.id === r9Eleventh.vencedor_id ? r9Eleventh.lado_b : r9Eleventh.lado_a;
    registerPoints(winner, pointsTable[11] || 20, '11º Lugar', 11, 8);
    registerPoints(loser, pointsTable[12] || 18, '12º Lugar', 12, 7);
  }

  const r13Final = games.find(g => g.code === 'R13_FINAL');
  if (r13Final && r13Final.status === 'encerrado' && r13Final.vencedor_id) {
    const winner = r13Final.lado_a?.id === r13Final.vencedor_id ? r13Final.lado_a : r13Final.lado_b;
    const loser = r13Final.lado_a?.id === r13Final.vencedor_id ? r13Final.lado_b : r13Final.lado_a;
    registerPoints(winner, pointsTable[13] || 16, '13º Lugar', 13, 8);
    registerPoints(loser, pointsTable[14] || 14, '14º Lugar', 14, 7);
  }

  const r13Fifteenth = games.find(g => g.code === 'R13_15LUGAR');
  if (r13Fifteenth && r13Fifteenth.status === 'encerrado' && r13Fifteenth.vencedor_id) {
    const winner = r13Fifteenth.lado_a?.id === r13Fifteenth.vencedor_id ? r13Fifteenth.lado_a : r13Fifteenth.lado_b;
    const loser = r13Fifteenth.lado_a?.id === r13Fifteenth.vencedor_id ? r13Fifteenth.lado_b : r13Fifteenth.lado_a;
    registerPoints(winner, pointsTable[15] || 12, '15º Lugar', 15, 8);
    registerPoints(loser, pointsTable[16] || 10, '16º Lugar', 16, 7);
  }

  // 5. Chave Reversa 17º–27º Lugar
  const r17Final = games.find(g => g.code === 'R17_FINAL');
  if (r17Final && r17Final.status === 'encerrado' && r17Final.vencedor_id) {
    const winner = r17Final.lado_a?.id === r17Final.vencedor_id ? r17Final.lado_a : r17Final.lado_b;
    const loser = r17Final.lado_a?.id === r17Final.vencedor_id ? r17Final.lado_b : r17Final.lado_a;
    registerPoints(winner, pointsTable[17] || 8, '17º Lugar', 17, 8);
    registerPoints(loser, pointsTable[18] || 7, '18º Lugar', 18, 7);
  }

  const r17Nineteenth = games.find(g => g.code === 'R17_19LUGAR');
  if (r17Nineteenth && r17Nineteenth.status === 'encerrado' && r17Nineteenth.vencedor_id) {
    const winner = r17Nineteenth.lado_a?.id === r17Nineteenth.vencedor_id ? r17Nineteenth.lado_a : r17Nineteenth.lado_b;
    const loser = r17Nineteenth.lado_a?.id === r17Nineteenth.vencedor_id ? r17Nineteenth.lado_b : r17Nineteenth.lado_a;
    registerPoints(winner, pointsTable[19] || 6, '19º Lugar', 19, 8);
    registerPoints(loser, pointsTable[20] || 5, '20º Lugar', 20, 7);
  }

  const r21Final = games.find(g => g.code === 'R21_FINAL');
  if (r21Final && r21Final.status === 'encerrado' && r21Final.vencedor_id) {
    const winner = r21Final.lado_a?.id === r21Final.vencedor_id ? r21Final.lado_a : r21Final.lado_b;
    const loser = r21Final.lado_a?.id === r21Final.vencedor_id ? r21Final.lado_b : r21Final.lado_a;
    registerPoints(winner, pointsTable[21] || 4, '21º Lugar', 21, 8);
    registerPoints(loser, pointsTable[22] || 3, '22º Lugar', 22, 7);
  }

  const r21Third = games.find(g => g.code === 'R21_23LUGAR');
  if (r21Third && r21Third.status === 'encerrado' && r21Third.vencedor_id) {
    const winner = r21Third.lado_a?.id === r21Third.vencedor_id ? r21Third.lado_a : r21Third.lado_b;
    const loser = r21Third.lado_a?.id === r21Third.vencedor_id ? r21Third.lado_b : r21Third.lado_a;
    registerPoints(winner, pointsTable[23] || 2, '23º Lugar', 23, 8);
    registerPoints(loser, pointsTable[24] || 1, '24º Lugar', 24, 7);
  }

  const r25Final = games.find(g => g.code === 'R25_FINAL');
  if (r25Final && r25Final.status === 'encerrado' && r25Final.vencedor_id) {
    const winner = r25Final.lado_a?.id === r25Final.vencedor_id ? r25Final.lado_a : r25Final.lado_b;
    const loser = r25Final.lado_a?.id === r25Final.vencedor_id ? r25Final.lado_b : r25Final.lado_a;
    registerPoints(winner, pointsTable[25] || 1, '25º Lugar', 25, 8);
    registerPoints(loser, pointsTable[26] || 1, '26º Lugar', 26, 7);
  }

  // Converte Map para Array e ordena por pontos decrescente
  const list = Array.from(teamMap.values());
  list.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    return a.colocacao - b.colocacao;
  });

  return list;
}
