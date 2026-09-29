// Módulo de Programação — 4 Dias × 20 Quadras (com Drag & Drop)
import { store } from '../data/store.js';
import { openMatchModal } from './modal.js';

const TOTAL_COURTS = 20;
const DAY_NAMES    = ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4'];
const START_HOUR   = 8;
const END_HOUR     = 17;
const MATCH_DURATION_MIN = 120; // 2h por confronto

// Fases → dia do evento
const FASE_DAY_MAP = {
  '1ª Fase':                0,
  'Oitavas de Final':       1,
  'Repescagem R2':          1,
  'Quartas de Final':       2,
  'Repescagem R3':          2,
  'Repescagem R4':          2,
  'Semifinal':              2,
  'Repescagem R5':          3,
  'Disputa 5º Lugar':       3,
  'Disputa 3º e 4º':        3,
  'Grande Final (1º e 2º)': 3,
};

// Categorias que devem jogar nos PRIMEIROS horários do dia
const PRIORITY_CATS = new Set(['sub12', 'sub14', 'master50', 'master60']);

// Cores por categoria
const CAT_COLORS = {
  prof:     { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  cat_a:    { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
  cat_b:    { bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },
  cat_c:    { bg: '#fefce8', border: '#ca8a04', text: '#713f12' },
  sub12:    { bg: '#ffe4e6', border: '#f43f5e', text: '#881337' },
  sub14:    { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  sub16:    { bg: '#ede9fe', border: '#7c3aed', text: '#3b0764' },
  sub18:    { bg: '#ddd6fe', border: '#6d28d9', text: '#2e1065' },
  master40: { bg: '#fef3c7', border: '#d97706', text: '#78350f' },
  master50: { bg: '#fef9c3', border: '#eab308', text: '#713f12' },
  master60: { bg: '#ecfdf5', border: '#10b981', text: '#064e3b' },
};

let activeDay = 0;
let filterCat = '';
let _dragData = null;

export function initScheduleView() {
  window.switchScheduleDay = (day) => { activeDay = day; renderSchedule(); };
  window.handleFilterScheduleCat = () => {
    filterCat = document.getElementById('sched-filter-cat')?.value || '';
    renderSchedule();
  };
  window.autoScheduleAll = () => { autoDistribute(); renderSchedule(); };
}

export function renderSchedule() {
  const container = document.getElementById('view-programacao');
  if (!container) return;

  const categories = store.getActiveCategories();
  const allGames = getEligibleGames();
  const perDay = [0,1,2,3].map(d => allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === d).length);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
      <div>
        <h2 style="margin:0;font-family:var(--font-display);color:var(--accent-dark-blue);font-size:1.4rem;">📅 Programação do Evento</h2>
        <p style="margin:.2rem 0 0;color:var(--text-muted);font-size:.85rem;">
          ${TOTAL_COURTS} quadras · 08:00–17:00 · 4 dias ·
          <span style="color:#f43f5e;font-weight:700;">Sub 12, Sub 14, +50 e +60</span> nos primeiros horários ·
          <em>Arraste para reorganizar</em>
        </p>
      </div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="window.autoScheduleAll()" style="white-space:nowrap;">⚡ Distribuir Automaticamente</button>
        <select id="sched-filter-cat" class="form-select" style="width:auto;" onchange="window.handleFilterScheduleCat()">
          <option value="">Todas as Categorias</option>
          ${categories.map(c => `<option value="${c.id}" ${c.id===filterCat?'selected':''}>${c.nome}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- CARDS DOS DIAS -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.25rem;">
      ${[0,1,2,3].map(d => {
        const dayGames = allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === d);
        const phases = [...new Set(dayGames.map(g=>g.fase))];
        const isActive = d === activeDay;
        return `<div onclick="window.switchScheduleDay(${d})" style="cursor:pointer;padding:.85rem 1rem;border-radius:10px;border:2px solid ${isActive?'var(--primary)':'var(--border-light)'};background:${isActive?'var(--primary-light)':'#fff'};transition:.15s;">
          <div style="font-weight:800;font-size:1rem;color:${isActive?'var(--primary)':'var(--accent-dark-blue)'};">${DAY_NAMES[d]}</div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem;">${phases.slice(0,2).join(' · ')||'—'}</div>
          <div style="font-size:1.5rem;font-weight:900;color:${isActive?'var(--primary)':'var(--accent-dark-blue)'};margin-top:.3rem;">${perDay[d]} <span style="font-size:.75rem;font-weight:600;">confrontos</span></div>
        </div>`;
      }).join('')}
    </div>

    <!-- LEGENDA -->
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem;">
      ${categories.map(c => {
        const col = CAT_COLORS[c.id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
        const prio = PRIORITY_CATS.has(c.id) ? '⭐ ' : '';
        return `<span style="padding:.2rem .65rem;border-radius:999px;font-size:.72rem;font-weight:700;background:${col.bg};border:1px solid ${col.border};color:${col.text};">${prio}${c.nome}</span>`;
      }).join('')}
      <span style="padding:.2rem .65rem;border-radius:999px;font-size:.72rem;font-weight:600;background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;">⭐ = Primeiro horário</span>
    </div>

    ${renderDayGrid(activeDay, categories, allGames)}
  `;

  setupDragDrop();
}

// Retorna apenas jogos com confrontos definidos (os dois lados)
function getEligibleGames() {
  return store.getAllGames().filter(g => !g.is_bye && g.lado_a && g.lado_b);
}

// ─── DISTRIBUIÇÃO AUTOMÁTICA ─────────────────────────────────────────────────
function autoDistribute() {
  const allGames = getEligibleGames();
  const phaseOrder = ['1ª Fase','Oitavas de Final','Repescagem R2','Quartas de Final','Repescagem R3','Repescagem R4','Semifinal','Repescagem R5','Disputa 5º Lugar','Disputa 3º e 4º','Grande Final (1º e 2º)'];

  // Agrupa por dia
  const byDay = {0:[],1:[],2:[],3:[]};
  allGames.forEach(g => {
    const d = FASE_DAY_MAP[g.fase] ?? 3;
    byDay[d].push(g);
  });

  [0,1,2,3].forEach(day => {
    const dayGames = byDay[day];
    const maxSlotMin = (END_HOUR - START_HOUR)*60 - MATCH_DURATION_MIN;
    const allSlots = [];
    for (let m = 0; m <= maxSlotMin; m += MATCH_DURATION_MIN) allSlots.push(m);

    // Separa prioritárias × normais
    const priority = dayGames.filter(g => PRIORITY_CATS.has(g.categoria_id));
    const normal   = dayGames.filter(g => !PRIORITY_CATS.has(g.categoria_id));

    // Ordena internamente por fase
    const sortByPhase = (a,b) => phaseOrder.indexOf(a.fase)-phaseOrder.indexOf(b.fase);
    priority.sort(sortByPhase);
    normal.sort(sortByPhase);

    // Preenchimento: primeiro aloca slots das primeiras rodadas de horário para as prioritárias,
    // depois preenche o restante com normais
    const occupied = new Map(); // key "court_slotMin" → true

    function placeGame(game) {
      // Para prioritárias, tenta SEMPRE a menor slot primeiro
      // Para normais, preenche na sequência normal
      for (const slotMin of allSlots) {
        for (let court = 1; court <= TOTAL_COURTS; court++) {
          const key = `${court}_${slotMin}`;
          if (!occupied.has(key)) {
            occupied.set(key, true);
            game._schedDay     = day;
            game._schedCourt   = court;
            game._schedSlotMin = slotMin;
            game._schedTime    = minToTime(START_HOUR*60+slotMin);
            return;
          }
        }
      }
      // overflow
      game._schedDay = day; game._schedCourt = TOTAL_COURTS; game._schedSlotMin = maxSlotMin; game._schedTime = minToTime(START_HOUR*60+maxSlotMin);
    }

    // Aloca prioritárias em bloco inicial (primeiros N slots)
    // Para garantir que fiquem cedo: preenche de slotMin=0 em diante
    priority.forEach(g => placeGame(g));

    // Aloca normais no restante disponível
    normal.forEach(g => placeGame(g));
  });
}

// ─── GRADE DO DIA ─────────────────────────────────────────────────────────────
function renderDayGrid(day, categories, allGames) {
  let filtered = allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === day);
  if (filterCat) filtered = filtered.filter(g => g.categoria_id === filterCat);

  const maxSlotMin = (END_HOUR - START_HOUR)*60 - MATCH_DURATION_MIN;
  const allSlots = [];
  for (let m = 0; m <= maxSlotMin; m += MATCH_DURATION_MIN) allSlots.push(m);
  const allCourts = Array.from({length: TOTAL_COURTS}, (_,i) => i+1);

  if (filtered.length === 0) return `
    <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);background:#f8fafc;border-radius:12px;">
      <div style="font-size:2.5rem;margin-bottom:.5rem;">📭</div>
      <p style="margin:0;font-weight:600;">Nenhum confronto para este dia.</p>
      <p style="margin:.5rem 0 0;font-size:.85rem;">Clique em <strong>⚡ Distribuir Automaticamente</strong>.</p>
    </div>`;

  // Quais slots têm algum jogo?
  const usedSlots = [...new Set(filtered.map(g => g._schedSlotMin??0))].sort((a,b)=>a-b);

  const rows = allSlots.map((slotMin, si) => {
    const hasGames = filtered.some(g => (g._schedSlotMin??0) === slotMin);
    const timeStr  = minToTime(START_HOUR*60+slotMin);
    const endStr   = minToTime(START_HOUR*60+slotMin+MATCH_DURATION_MIN);
    const rowBg    = si%2===0 ? '#f8fafc' : '#fff';

    const cells = allCourts.map(court => {
      const game = filtered.find(g => (g._schedCourt??1)===court && (g._schedSlotMin??0)===slotMin);
      if (!game) return `
        <td style="padding:.3rem;border:1px solid #f1f5f9;background:${rowBg};min-width:120px;">
          <div class="sched-drop-zone" data-court="${court}" data-slot="${slotMin}" data-day="${day}"
            style="min-height:65px;border:2px dashed #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:.68rem;cursor:default;">soltar</div>
        </td>`;

      const col = CAT_COLORS[game.categoria_id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
      const catName = categories.find(c=>c.id===game.categoria_id)?.nome||game.categoria_id;
      const isPriority = PRIORITY_CATS.has(game.categoria_id);
      const byesList = store.getCategoryByes(game.categoria_id);
      const rankA = byesList.indexOf(game.lado_a?.id)+1;
      const rankB = game.lado_b ? byesList.indexOf(game.lado_b.id)+1 : 0;
      return `
        <td style="padding:.3rem;border:1px solid #f1f5f9;vertical-align:top;min-width:120px;">
          <div class="sched-game-card" draggable="true"
            data-code="${game.code}" data-cat="${game.categoria_id}"
            data-court="${game._schedCourt??1}" data-slot="${game._schedSlotMin??0}" data-day="${day}"
            title="Arraste para mover"
            style="cursor:grab;padding:.45rem .55rem;border-radius:8px;border:1.5px solid ${col.border};background:${col.bg};min-height:65px;user-select:none;position:relative;">
            ${isPriority ? `<div style="position:absolute;top:3px;right:4px;font-size:.6rem;">⭐</div>` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.2rem;padding-right:.8rem;">
              <span style="font-weight:800;font-size:.68rem;color:${col.text};">${game.code}</span>
              <span style="font-size:.55rem;font-weight:700;padding:.1rem .25rem;border-radius:3px;background:${col.border};color:#fff;">${catName}</span>
            </div>
            <div style="font-size:.75rem;font-weight:700;color:#1e293b;">${rankA>0?`<span style='color:${col.border};font-size:.62rem;font-weight:800;'>#${rankA} </span>`:''}${game.lado_a?.uf||'?'}</div>
            <div style="font-size:.65rem;color:#64748b;margin:.05rem 0;">vs</div>
            <div style="font-size:.75rem;font-weight:700;color:#1e293b;">${rankB>0?`<span style='color:${col.border};font-size:.62rem;font-weight:800;'>#${rankB} </span>`:''}${game.lado_b?.uf||'?'}</div>
            <div style="font-size:.58rem;color:#94a3b8;margin-top:.2rem;">${game.fase}</div>
          </div>
        </td>`;
    }).join('');

    return `<tr style="background:${rowBg};">
      <td style="padding:.55rem .7rem;font-weight:700;font-size:.8rem;white-space:nowrap;color:#475569;border-right:2px solid #e2e8f0;vertical-align:middle;background:${rowBg};">
        ${timeStr}<br><span style="font-size:.65rem;color:#94a3b8;font-weight:400;">até ${endStr}</span>
      </td>${cells}</tr>`;
  }).join('');

  const headCells = allCourts.map(c=>`<th style="padding:.5rem .4rem;background:#1e293b;color:#fff;font-size:.72rem;text-align:center;white-space:nowrap;min-width:120px;">Q.${c}</th>`).join('');

  // Lista detalhada
  const sortedFiltered = filtered.slice().sort((a,b)=>(a._schedSlotMin??0)-(b._schedSlotMin??0)||(a._schedCourt??0)-(b._schedCourt??0));
  const list = sortedFiltered.map(g => {
    const col = CAT_COLORS[g.categoria_id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
    const catName = categories.find(c=>c.id===g.categoria_id)?.nome||g.categoria_id;
    const isPriority = PRIORITY_CATS.has(g.categoria_id);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.55rem .9rem;border:1px solid ${col.border};border-radius:8px;background:${col.bg};">
      <div style="display:flex;align-items:center;gap:.75rem;">
        <span style="font-weight:800;font-size:.82rem;color:${col.text};min-width:50px;">${isPriority?'⭐ ':''}${g.code}</span>
        <div>
          <div style="font-weight:700;font-size:.88rem;color:#1e293b;">${g.lado_a?.nome} (${g.lado_a?.uf}) vs ${g.lado_b?.nome} (${g.lado_b?.uf})</div>
          <div style="font-size:.73rem;color:#64748b;">${catName} · ${g.fase}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;flex-shrink:0;">
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:.88rem;color:${col.text};">🏟️ Quadra ${g._schedCourt??'?'}</div>
          <div style="font-size:.73rem;color:#64748b;">🕒 ${g._schedTime||'--:--'}</div>
        </div>
        <span class="badge-status ${g.status}" style="font-size:.62rem;">${g.status}</span>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="overflow-x:auto;margin-bottom:1.5rem;">
      <table style="border-collapse:collapse;width:100%;min-width:${120+TOTAL_COURTS*125}px;">
        <thead><tr>
          <th style="padding:.5rem .7rem;background:#1e293b;color:#fff;font-size:.78rem;text-align:left;white-space:nowrap;min-width:85px;">⏰ Horário</th>
          ${headCells}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <h4 style="font-family:var(--font-display);color:var(--accent-dark-blue);margin:0 0 .75rem;">
      📋 Lista Detalhada — ${DAY_NAMES[day]} (${filtered.length} confrontos)
    </h4>
    <div style="display:flex;flex-direction:column;gap:.45rem;">${list || '<p style="color:var(--text-muted);">Nenhum jogo neste dia.</p>'}</div>`;
}

// ─── DRAG & DROP ─────────────────────────────────────────────────────────────
function setupDragDrop() {
  const cards = document.querySelectorAll('.sched-game-card');
  const zones = document.querySelectorAll('.sched-drop-zone');

  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      _dragData = { code: card.dataset.code, cat: card.dataset.cat,
                    court: +card.dataset.court, slot: +card.dataset.slot, day: +card.dataset.day };
      card.style.opacity = '.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => { card.style.opacity = '1'; });

    // Soltar em cima de outro card = troca de posição
    card.addEventListener('dragover', e => { e.preventDefault(); card.style.boxShadow = '0 0 0 3px #3b82f6'; });
    card.addEventListener('dragleave', () => { card.style.boxShadow = ''; });
    card.addEventListener('drop', e => {
      e.preventDefault(); card.style.boxShadow = '';
      if (!_dragData || _dragData.code === card.dataset.code) return;
      const allGames = getEligibleGames();
      const src = allGames.find(g => g.code === _dragData.code && g.categoria_id === _dragData.cat);
      const dst = allGames.find(g => g.code === card.dataset.code && g.categoria_id === card.dataset.cat);
      if (src && dst) {
        [src._schedCourt, dst._schedCourt] = [dst._schedCourt, src._schedCourt];
        [src._schedSlotMin, dst._schedSlotMin] = [dst._schedSlotMin, src._schedSlotMin];
        [src._schedDay, dst._schedDay] = [dst._schedDay, src._schedDay];
        [src._schedTime, dst._schedTime] = [dst._schedTime, src._schedTime];
      }
      _dragData = null; renderSchedule();
    });
  });

  zones.forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.style.background = '#dbeafe'; zone.style.borderColor = '#3b82f6'; zone.style.color = '#1d4ed8';
    });
    zone.addEventListener('dragleave', () => {
      zone.style.background = ''; zone.style.borderColor = '#e2e8f0'; zone.style.color = '#cbd5e1';
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.background = ''; zone.style.borderColor = '#e2e8f0';
      if (!_dragData) return;
      const allGames = getEligibleGames();
      const game = allGames.find(g => g.code === _dragData.code && g.categoria_id === _dragData.cat);
      if (game) {
        game._schedDay     = +zone.dataset.day;
        game._schedCourt   = +zone.dataset.court;
        game._schedSlotMin = +zone.dataset.slot;
        game._schedTime    = minToTime(START_HOUR*60+(+zone.dataset.slot));
      }
      _dragData = null; renderSchedule();
    });
  });
}

function minToTime(totalMin) {
  return Math.floor(totalMin/60).toString().padStart(2,'0')+':'+((totalMin%60).toString().padStart(2,'0'));
}
