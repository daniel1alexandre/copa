# Copa Federações 2026 — Gerenciador de Torneios de Beach Tennis

Aplicativo web completo para gerenciamento de torneios de Beach Tennis entre as 27 federações estaduais brasileiras, baseado na estrutura oficial de chaveamento por eliminação simples com BYEs, chaves reversas (disputas de colocação de 1º a 27º lugar), grafo de propagação de jogos e modo Telão para TVs/projetores.

---

## 🚀 Como Executar

O servidor de desenvolvimento local já está rodando ou pode ser iniciado a qualquer momento com Node.js (sem necessidade de instalar dependências externas):

```bash
node server.js
```

Acesse no navegador:
**[http://localhost:3000](http://localhost:3000)**

---

## 🎯 Principais Funcionalidades

### 1. 🏠 Home / Painel
- **KPIs em tempo real**: Federações participantes (27), Categorias ativas (12), Jogos ao vivo e Jogos encerrados.
- **Destaque de confrontos em andamento**: Visualização imediata dos confrontos em quadra com placar parcial dos 3 jogos (F, M, DX).
- **Acesso rápido e fila de espera**: Próximos jogos prontos para entrar em quadra.

### 2. 🎾 Menu Categorias (Novo!)
- **Gestão de Estados Participantes por Categoria**:
  - Permite definir exatamente quais federações estaduais disputam cada uma das 12 categorias.
  - **Cálculo Dinâmico de BYEs**:
    - **27 estados participantes**: 5 BYEs (vagas livres para as Oitavas) e 11 confrontos na 1ª fase.
    - **26 estados participantes**: 6 BYEs e 10 confrontos na 1ª fase.
    - **25 estados participantes**: 7 BYEs e 9 confrontos na 1ª fase.
    - $N$ estados participantes: exatamente $32 - N$ vagas livres de avanço automático.
  - Atalhos rápidos: *"Todos os 27 Estados"*, *"Simular 26 Estados"*, *"Simular 25 Estados"*.
  - Ativação/desativação de categorias no torneio.

### 3. 📊 Chaveamento & Grafo de Jogos
- **Informativo de Participantes e BYEs da Categoria**:
  - Informa claramente quantos estados disputam a categoria, quantas vagas livres (BYEs) foram geradas e quantos confrontos acontecem na 1ª fase.
- **Personalização Completa da 1ª Rodada**:
  - Botão **"⚙️ Editar 1ª Rodada & BYEs"** para montar quem joga contra quem ou definir BYEs manuais.
- **Grafo de Jogos Automático**:
  - Quando uma federação vence 2 jogos na série melhor de 3, o vencedor avança automaticamente para a próxima fase (`proxima_fase`).
  - O perdedor é propagado automaticamente para a respectiva Chave Reversa (`proxima_fase_perdedor`).
- **Pontuação Progressiva**:
  - Conforme os estados vão passando de fase (1ª Fase -> Oitavas -> Quartas -> Semis -> Finais), recebem os pontos progressivos correspondentes à fase alcançada.
- **Dois Modos de Visualização**:
  - **Árvore Visual (Bracket)**: Árvore completa com fases e status.
  - **Tabela em Lista Detalhada**: Com colunas Nº | Estado A | Estado B | Jogo 1 (F) | Jogo 2 (M) | Jogo 3 (DX) | Placar Geral | Vencedor | Perdedor | Próxima Fase.
- **Chaves Reversas Completas (Disputas de Colocação)**:
  - 🏆 Chave Principal (1º ao 4º)
  - 🔄 Chave Reversa 5º–8º Lugar
  - 🔄 Chave Reversa 9º–16º (9º-12º e 13º-16º)
  - 🔄 Chave Reversa 17º–27º (17º-20º, 21º-24º, 25º-27º)

### 4. 🏆 Classificação & Ranking Geral das Federações
- **Pontuação ao vivo agregada**: Soma automática dos pontos conquistados em todas as categorias ativas.
- **Pódio Olímpico destacado**: 🥇 Campeão Brasileiro Geral, 🥈 Vice-Campeão e 🥉 3º Colocado.
- **Tabela Ordenável por qualquer coluna**: Clique no cabeçalho de qualquer categoria para reordenar.

### 6. 👥 Federações & Atletas
- **Cadastro das 27 federações oficiais** com cores estaduais e siglas.
- **Gestão de Atletas**: Adicionar, editar, remover e listar.
- **Validação de Conflito**: Alerta se um atleta tentar defender duas federações na mesma categoria.
- **Importação em Massa**: Aceita colar listas ou CSV (`Nome; UF; Categorias`).

### 7. ⚙️ Configurações do Torneio
- Edição de metadados do torneio (nome, local, datas, tempo de jogo e aquecimento).
- Toggle para ativar/desativar cada uma das 12 categorias.
- **Tabela de pontuação editável** (1º a 27º colocado).
- Cadastro de quadras (adicionar novas quadras, definir disponíveis/manutenção).
- Exportação e importação de backup em JSON e botão para restaurar dados padrão.

---

## 🎨 Identidade Visual
- **Paleta**: Turquesa e azul oceânico (`#028090`, `#00A896`, `#0B1A30`) + Areia e laranja vibrante (`#F4A261`, `#E76F51`, `#FFB703`).
- **Tipografia**: Google Fonts *Plus Jakarta Sans* e *Outfit*.
- **Persistência**: `localStorage` (salva todas as edições, agendamentos e placares no navegador).
