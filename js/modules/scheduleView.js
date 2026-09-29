// Módulo de Programação — 4 Dias × 20 Quadras (com Drag & Drop)
import { store } from '../data/store.js';
import { openMatchModal } from './modal.js';

const TOTAL_COURTS = 20;
const DAY_NAMES   = ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4'];
const START_HOUR  = 8;
const END_HOUR    = 17;
const MATCH_DURATION_MIN = 120;

const FASE_DAY_MAP = {
  '1ª Fase':               0,
  'Oitavas de Final':      1,
  'Repescagem R2':         1,
  'Quartas de Final':      2,
  'Repescagem R3':         2,
  'Repescagem R4':         2,
  'Semifinal':             2,
  'Repescagem R5':         3,
  'Disputa 5º Lugar':      3,
  'Disputa 3º e 4º':       3,
  'Grande Final (1º e 2º)':3,
};

const CAT_COLORS = {
  prof:   { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  master: { bg: '#ede9fe', border: '#7c3aed', text: '#3b0764' },
  senior: { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  sup35:  { bg: '#fef3c7', border: '#d97706', text: '#78350f' },
  sup45:  { bg: '#ffe4e6', border: '#e11d48', text: '#881337' },
  sup55:  { bg: '#f0fdf4', border: '#059669', text: '#064e3b' },
};

let activeDay = 0;
let filterCat = '';
// Variável de drag estado
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
  const allGames = store.getAllGames().filter(g => !g.is_bye && g.lado_a && g.lado_b);
  const perDay = [0,1,2,3].map(d => allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === d).length);

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
      <div>
        <h2 style="margin:0;font-family:var(--font-display);color:var(--accent-dark-blue);font-size:1.4rem;">📅 Programação do Evento</h2>
        <p style="margin:.2rem 0 0;color:var(--text-muted);font-size:.85rem;">${TOTAL_COURTS} quadras · 08:00–17:00 · 4 dias · <em>Arraste os cards para reorganizar</em></p>
      </div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="window.autoScheduleAll()" style="white-space:nowrap;">⚡ Distribuir Automaticamente</button>
        <select id="sched-filter-cat" class="form-select" style="width:auto;" onchange="window.handleFilterScheduleCat()">
          <option value="">Todas as Categorias</option>
          ${categories.map(c => `<option value="${c.id}" ${c.id===filterCat?'selected':''}>${c.nome}</option>`).join('')}
        </select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.25rem;">
      ${[0,1,2,3].map(d => {
        const phases = [...new Set(allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0)===d).map(g=>g.fase))];
        const isActive = d === activeDay;
        return `<div onclick="window.switchScheduleDay(${d})" style="cursor:pointer;padding:.85rem 1rem;border-radius:10px;border:2px solid ${isActive?'var(--primary)':'var(--border-light)'};background:${isActive?'var(--primary-light)':'#fff'};transition:.15s;">
          <div style="font-weight:800;font-size:1rem;color:${isActive?'var(--primary)':'var(--accent-dark-blue)'};">${DAY_NAMES[d]}</div>
          <div style="font-size:.73rem;color:var(--text-muted);margin-top:.2rem;">${phases.slice(0,2).join(' · ')||'—'}</div>
          <div style="font-size:1.5rem;font-weight:900;color:${isActive?'var(--primary)':'var(--accent-dark-blue)'};margin-top:.3rem;">${perDay[d]} <span style="font-size:.75rem;font-weight:600;">confrontos</span></div>
        </div>`;
      }).join('')}
    </div>

    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem;">
      ${categories.map(c => {
        const col = CAT_COLORS[c.id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
        return `<span style="padding:.2rem .65rem;border-radius:999px;font-size:.72rem;font-weight:700;background:${col.bg};border:1px solid ${col.border};color:${col.text};">${c.nome}</span>`;
      }).join('')}
      <span style="padding:.2rem .65rem;border-radius:999px;font-size:.72rem;font-weight:600;background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;">
        💡 Arraste um card para outro horário/quadra para mover
      </span>
    </div>

    ${renderDayGrid(activeDay, categories, allGames)}
  `;

  setupDragDrop();
}

function autoDistribute() {
  const allGames = store.getAllGames().filter(g => !g.is_bye && g.lado_a && g.lado_b);
  const phaseOrder = ['1ª Fase','Oitavas de Final','Repescagem R2','Quartas de Final','Repescagem R3','Repescagem R4','Semifinal','Repescagem R5','Disputa 5º Lugar','Disputa 3º e 4º','Grande Final (1º e 2º)'];
  allGames.sort((a,b) => {
    const da = FASE_DAY_MAP[a.fase]??3, db = FASE_DAY_MAP[b.fase]??3;
    if (da!==db) return da-db;
    return phaseOrder.indexOf(a.fase)-phaseOrder.indexOf(b.fase);
  });
  const occupied = {0:{},1:{},2:{},3:{}};
  const maxSlotMin = (END_HOUR - START_HOUR)*60 - MATCH_DURATION_MIN;
  allGames.forEach(game => {
    const dayIdx = FASE_DAY_MAP[game.fase] ?? 3;
    const occ = occupied[dayIdx];
    let placed = false;
    outer: for (let slotMin = 0; slotMin <= maxSlotMin; slotMin += MATCH_DURATION_MIN) {
      for (let court = 1; court <= TOTAL_COURTS; court++) {
        const key = court+'_'+slotMin;
        if (!occ[key]) {
          occ[key] = true;
          game._schedDay = dayIdx;
          game._schedCourt = court;
          game._schedSlotMin = slotMin;
          game._schedTime = minToTime(START_HOUR*60+slotMin);
          placed = true;
          break outer;
        }
      }
    }
    if (!placed) { game._schedDay=dayIdx; game._schedCourt=TOTAL_COURTS; game._schedTime='17:00'; game._schedSlotMin=maxSlotMin; }
  });
}

function renderDayGrid(day, categories, allGames) {
  let filtered = allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === day);
  if (filterCat) filtered = filtered.filter(g => g.categoria_id === filterCat);

  const maxSlotMin = (END_HOUR - START_HOUR)*60 - MATCH_DURATION_MIN;
  const allSlots = [];
  for (let m = 0; m <= maxSlotMin; m += MATCH_DURATION_MIN) allSlots.push(m);
  const allCourts = Array.from({length: TOTAL_COURTS}, (_,i) => i+1);

  const filledCells = new Set(filtered.map(g => `${g._schedCourt??1}_${g._schedSlotMin??0}`));
  const isEmpty = filtered.length === 0;

  if (isEmpty) return `
    <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);background:#f8fafc;border-radius:12px;">
      <div style="font-size:2.5rem;margin-bottom:.5rem;">📭</div>
      <p style="margin:0;font-weight:600;">Nenhum confronto para este dia.</p>
      <p style="margin:.5rem 0 0;font-size:.85rem;">Clique em <strong>⚡ Distribuir Automaticamente</strong>.</p>
    </div>`;

  const rows = allSlots.map((slotMin, si) => {
    const timeStr = minToTime(START_HOUR*60+slotMin);
    const endStr  = minToTime(START_HOUR*60+slotMin+MATCH_DURATION_MIN);
    const rowBg   = si%2===0 ? '#f8fafc' : '#fff';
    const cells = allCourts.map(court => {
      const game = filtered.find(g => (g._schedCourt??1)===court && (g._schedSlotMin??0)===slotMin);
      const cellKey = `${court}_${slotMin}`;
      if (!game) {
        return `<td style="padding:.4rem;border:1px solid #f1f5f9;background:${rowBg};min-width:130px;">
          <div class="sched-drop-zone" data-court="${court}" data-slot="${slotMin}" data-day="${day}"
            style="min-height:70px;border:2px dashed #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:.72rem;transition:.15s;">
            soltar aqui
          </div>
        </td>`;
      }
      const col = CAT_COLORS[game.categoria_id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
      const catName = categories.find(c=>c.id===game.categoria_id)?.nome||game.categoria_id;
      const byesList = store.getCategoryByes(game.categoria_id);
      const rankA = byesList.indexOf(game.lado_a?.id)+1;
      const rankB = game.lado_b ? byesList.indexOf(game.lado_b.id)+1 : 0;
      return `<td style="padding:.4rem;border:1px solid #f1f5f9;vertical-align:top;min-width:130px;">
        <div class="sched-game-card" draggable="true"
          data-code="${game.code}" data-cat="${game.categoria_id}"
          data-court="${game._schedCourt??1}" data-slot="${game._schedSlotMin??0}" data-day="${day}"
          style="cursor:grab;padding:.5rem .65rem;border-radius:8px;border:1.5px solid ${col.border};background:${col.bg};min-height:70px;user-select:none;transition:.15s;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;">
            <span style="font-weight:800;font-size:.72rem;color:${col.text};">${game.code}</span>
            <span style="font-size:.6rem;font-weight:700;padding:.1rem .3rem;border-radius:4px;background:${col.border};color:#fff;">${catName}</span>
          </div>
          <div style="font-size:.78rem;font-weight:700;color:#1e293b;">${rankA>0?`<span style='color:${col.border};font-size:.65rem;font-weight:800;'>#${rankA} </span>`:''}${game.lado_a?.uf||'?'}</div>
          <div style="font-size:.7rem;color:#64748b;font-weight:600;margin:.1rem 0;">vs</div>
          <div style="font-size:.78rem;font-weight:700;color:#1e293b;">${rankB>0?`<span style='color:${col.border};font-size:.65rem;font-weight:800;'>#${rankB} </span>`:''}${game.lado_b?.uf||'?'}</div>
          <div style="font-size:.62rem;color:#94a3b8;margin-top:.3rem;">${game.fase}</div>
        </div>
      </td>`;
    }).join('');
    return `<tr style="background:${rowBg};">
      <td style="padding:.6rem .75rem;font-weight:700;font-size:.82rem;white-space:nowrap;color:#475569;border-right:2px solid #e2e8f0;vertical-align:middle;">
        ${timeStr}<br><span style="font-size:.68rem;color:#94a3b8;font-weight:400;">até ${endStr}</span>
      </td>${cells}</tr>`;
  }).join('');

  const headCells = allCourts.map(c=>`<th style="padding:.55rem .5rem;background:#1e293b;color:#fff;font-size:.75rem;text-align:center;white-space:nowrap;min-width:130px;">Q.${c}</th>`).join('');

  const list = filtered.slice().sort((a,b)=>(a._schedSlotMin??0)-(b._schedSlotMin??0)||(a._schedCourt??0)-(b._schedCourt??0)).map(g => {
    const col = CAT_COLORS[g.categoria_id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
    const catName = categories.find(c=>c.id===g.categoria_id)?.nome||g.categoria_id;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .9rem;border:1px solid ${col.border};border-radius:8px;background:${col.bg};">
      <div style="display:flex;align-items:center;gap:.75rem;">
        <span style="font-weight:800;font-size:.85rem;color:${col.text};min-width:48px;">${g.code}</span>
        <div>
          <div style="font-weight:700;font-size:.9rem;color:#1e293b;">${g.lado_a?.nome} (${g.lado_a?.uf}) vs ${g.lado_b?.nome} (${g.lado_b?.uf})</div>
          <div style="font-size:.75rem;color:#64748b;">${catName} · ${g.fase}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;flex-shrink:0;">
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:.9rem;color:${col.text};">🏟️ Quadra ${g._schedCourt??'?'}</div>
          <div style="font-size:.75rem;color:#64748b;">🕒 ${g._schedTime||'--:--'}</div>
        </div>
        <span class="badge-status ${g.status}" style="font-size:.65rem;">${g.status}</span>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="overflow-x:auto;margin-bottom:1.5rem;">
      <table style="border-collapse:collapse;width:100%;min-width:${140+TOTAL_COURTS*135}px;">
        <thead><tr>
          <th style="padding:.55rem .75rem;background:#1e293b;color:#fff;font-size:.8rem;text-align:left;white-space:nowrap;min-width:90px;">⏰ Horário</th>
          ${headCells}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div>
      <h4 style="font-family:var(--font-display);color:var(--accent-dark-blue);margin:0 0 .75rem;">📋 Lista Detalhada — ${DAY_NAMES[day]} (${filtered.length} confrontos)</h4>
      <div style="display:flex;flex-direction:column;gap:.5rem;">${list}</div>
    </div>`;
}

function setupDragDrop() {
  const cards = document.querySelectorAll('.sched-game-card');
  const zones = document.querySelectorAll('.sched-drop-zone');

  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      _dragData = {
        code: card.dataset.code,
        cat:  card.dataset.cat,
        fromCourt: +card.dataset.court,
        fromSlot:  +card.dataset.slot,
        fromDay:   +card.dataset.day,
      };
      card.style.opacity = '.45';
      card.style.cursor  = 'grabbing';
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      card.style.cursor  = 'grab';
    });
  });

  zones.forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.style.background     = '#dbeafe';
      zone.style.borderColor    = '#3b82f6';
      zone.style.color          = '#1d4ed8';
    });
    zone.addEventListener('dragleave', () => {
      zone.style.background  = '';
      zone.style.borderColor = '#e2e8f0';
      zone.style.color       = '#cbd5e1';
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.background  = '';
      zone.style.borderColor = '#e2e8f0';
      if (!_dragData) return;

      const toCourt = +zone.dataset.court;
      const toSlot  = +zone.dataset.slot;
      const toDay   = +zone.dataset.day;

      // Move no objeto de jogo
      const allGames = store.getAllGames();
      const game = allGames.find(g => g.code === _dragData.code && g.categoria_id === _dragData.cat);
      if (game) {
        game._schedDay     = toDay;
        game._schedCourt   = toCourt;
        game._schedSlotMin = toSlot;
        game._schedTime    = minToTime(START_HOUR*60+toSlot);
      }
      _dragData = null;
      renderSchedule();
    });
  });

  // Drop em cima de outro card (troca de posição)
  cards.forEach(card => {
    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.style.boxShadow = '0 0 0 3px #3b82f6';
    });
    card.addEventListener('dragleave', () => { card.style.boxShadow = ''; });
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.style.boxShadow = '';
      if (!_dragData) return;

      const toCourt = +card.dataset.court;
      const toSlot  = +card.dataset.slot;
      const toDay   = +card.dataset.day;
      const toCode  = card.dataset.code;
      const toCat   = card.dataset.cat;

      if (_dragData.code === toCode) return; // mesmo card

      const allGames = store.getAllGames();
      const srcGame  = allGames.find(g => g.code === _dragData.code && g.categoria_id === _dragData.cat);
      const dstGame  = allGames.find(g => g.code === toCode && g.categoria_id === toCat);

      if (srcGame && dstGame) {
        // Troca as posições dos dois cards
        const tmpCourt = dstGame._schedCourt, tmpSlot = dstGame._schedSlotMin, tmpDay = dstGame._schedDay, tmpTime = dstGame._schedTime;
        dstGame._schedCourt = srcGame._schedCourt; dstGame._schedSlotMin = srcGame._schedSlotMin; dstGame._schedDay = srcGame._schedDay; dstGame._schedTime = srcGame._schedTime;
        srcGame._schedCourt = tmpCourt; srcGame._schedSlotMin = tmpSlot; srcGame._schedDay = tmpDay; srcGame._schedTime = tmpTime;
      }
      _dragData = null;
      renderSchedule();
    });
  });
}

function minToTime(totalMin) {
  const h = Math.floor(totalMin/60).toString().padStart(2,'0');
  const m = (totalMin%60).toString().padStart(2,'0');
  return h+':'+m;
}
