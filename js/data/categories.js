// Configuração das 11 Categorias Oficiais do Torneio
export const INITIAL_CATEGORIES = [
  { id: "prof", nome: "Profissional", ativa: true, formato: "Melhor de 3 (F, M, DX)", ordem: 1 },
  { id: "cat_a", nome: "Categoria A", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 2 },
  { id: "cat_b", nome: "Categoria B", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 3 },
  { id: "cat_c", nome: "Categoria C", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 4 },
  { id: "sub12", nome: "Sub 12", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 5 },
  { id: "sub14", nome: "Sub 14", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 6 },
  { id: "sub16", nome: "Sub 16", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 7 },
  { id: "sub18", nome: "Sub 18", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 8 },
  { id: "master40", nome: "+40 Master", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 9 },
  { id: "master50", nome: "+50 Master", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 10 },
  { id: "master60", nome: "+60 Master", ativa: true, formato: "2 sets até 4 games (3x3 tie-break até 7 pts) • Empate 1x1: Super TB até 10 pts", ordem: 11 }
];

// Tabela de Pontos padrão por colocação final em cada categoria (conforme edital CBT)
export const DEFAULT_POINTS_TABLE = {
  1: 55,
  2: 50,
  3: 45,
  4: 40,
  5: 36,
  6: 32,
  7: 29,
  8: 26,
  9: 23,
  10: 21,
  11: 19,
  12: 17,
  13: 15,
  14: 14,
  15: 13,
  16: 12,
  17: 11,
  18: 10,
  19: 9,
  20: 8,
  21: 7,
  22: 6,
  23: 5,
  24: 4,
  25: 3,
  26: 2,
  27: 1
};

// Quadras padrão da Arena Beach Tennis
export const INITIAL_COURTS = [
  { id: "q1", nome: "Quadra Central", disponivel: true, tipo: "Principal com telão e arquibancada" },
  { id: "q2", nome: "Quadra 2", disponivel: true, tipo: "Oficial" },
  { id: "q3", nome: "Quadra 3", disponivel: true, tipo: "Oficial" },
  { id: "q4", nome: "Quadra 4", disponivel: true, tipo: "Oficial" },
  { id: "q5", nome: "Quadra 5", disponivel: true, tipo: "Oficial" },
  { id: "q6", nome: "Quadra 6", disponivel: true, tipo: "Oficial" },
  { id: "q7", nome: "Quadra 7", disponivel: true, tipo: "Oficial" },
  { id: "q8", nome: "Quadra 8", disponivel: true, tipo: "Oficial" }
];

// Configuração padrão do Torneio
export const INITIAL_TOURNAMENT = {
  id: "copa-fed-2026",
  nome: "Copa Federações 2026",
  subtitulo: "Campeonato Brasileiro de Beach Tennis por Equipes Estaduais",
  dataInicio: "2026-10-15",
  dataFim: "2026-10-18",
  local: "Arena Beach Tennis Brasil - Praia de Copacabana, RJ",
  tempoMedioJogoMin: 50,
  tempoAquecimentoMin: 10,
  status: "ativo" // rascunho | ativo | encerrado
};
