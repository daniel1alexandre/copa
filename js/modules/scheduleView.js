// Módulo de Programação — 4 Dias × 20 Quadras
import { store } from '../data/store.js';

// ─── Configurações editáveis (defaults) ───────────────────────────────────────
let cfg = {
  startHour:    8,
  endHour:      17,
  matchMinutes: 120,
  courts:       20,
};

// Fases → índice do dia (0-based)
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

const PHASE_ORDER = ['1ª Fase','Oitavas de Final','Repescagem R2','Quartas de Final','Repescagem R3','Repescagem R4','Semifinal','Repescagem R5','Disputa 5º Lugar','Disputa 3º e 4º','Grande Final (1º e 2º)'];

// Categorias prioritárias (primeiros horários)
const PRIORITY_CATS = new Set(['sub12','sub14','master50','master60']);

// Cores por categoria
const CAT_COLORS = {
  prof:     {bg:'#dbeafe',border:'#3b82f6',text:'#1e3a8a'},
  cat_a:    {bg:'#e0f2fe',border:'#0284c7',text:'#0c4a6e'},
  cat_b:    {bg:'#f0fdf4',border:'#22c55e',text:'#14532d'},
  cat_c:    {bg:'#fefce8',border:'#ca8a04',text:'#713f12'},
  sub12:    {bg:'#ffe4e6',border:'#f43f5e',text:'#881337'},
  sub14:    {bg:'#fce7f3',border:'#ec4899',text:'#831843'},
  sub16:    {bg:'#ede9fe',border:'#7c3aed',text:'#3b0764'},
  sub18:    {bg:'#ddd6fe',border:'#6d28d9',text:'#2e1065'},
  master40: {bg:'#fef3c7',border:'#d97706',text:'#78350f'},
  master50: {bg:'#fef9c3',border:'#eab308',text:'#713f12'},
  master60: {bg:'#ecfdf5',border:'#10b981',text:'#064e3b'},
};

let activeDay    = 0;
let activeTab    = 'grade';  // 'grade' | 'config'
let filterCat    = '';
let _dragData    = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initScheduleView() {
  window.switchScheduleDay    = d  => { activeDay = d;   renderSchedule(); };
  window.switchScheduleTab    = t  => { activeTab = t;   renderSchedule(); };
  window.handleFilterSchedCat = () => { filterCat = document.getElementById('sched-filter-cat')?.value||''; renderSchedule(); };
  window.autoScheduleAll      = () => { autoDistribute(); renderSchedule(); };
  window.saveSchedConfig = () => {
    const sh = parseInt(document.getElementById('cfg-start-hour')?.value);
    const eh = parseInt(document.getElementById('cfg-end-hour')?.value);
    const mm = parseInt(document.getElementById('cfg-match-min')?.value);
    const cc = parseInt(document.getElementById('cfg-courts')?.value);
    if (!isNaN(sh)) cfg.startHour    = sh;
    if (!isNaN(eh)) cfg.endHour      = eh;
    if (!isNaN(mm)) cfg.matchMinutes = mm;
    if (!isNaN(cc)) cfg.courts       = cc;
    autoDistribute();
    renderSchedule();
  };
}

// ─── Render principal ─────────────────────────────────────────────────────────
export function renderSchedule() {
  const container = document.getElementById('view-programacao');
  if (!container) return;

  const tour       = store.getTournament();
  const categories = store.getActiveCategories();
  const allGames   = getEligibleGames();
  const dayDates   = buildDayDates(tour.dataInicio);
  const perDay     = [0,1,2,3].map(d => allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === d).length);

  container.innerHTML = `
    <!-- CABEÇALHO -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
      <div>
        <h2 style="margin:0;font-family:var(--font-display);color:var(--accent-dark-blue);font-size:1.4rem;">📅 Programação do Evento</h2>
        <p style="margin:.2rem 0 0;color:var(--text-muted);font-size:.83rem;">
          ${cfg.courts} quadras · ${pad(cfg.startHour)}:00–${pad(cfg.endHour)}:00 · ${cfg.matchMinutes}min/confronto ·
          <span style="color:#f43f5e;font-weight:700;">⭐ Sub12, Sub14, +50, +60</span> nos primeiros horários
        </p>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="window.autoScheduleAll()" style="white-space:nowrap;">⚡ Distribuir Automaticamente</button>
        <button class="btn ${activeTab==='grade'?'btn-secondary':'btn-outline'} btn-sm" onclick="window.switchScheduleTab('grade')">📊 Grade</button>
        <button class="btn ${activeTab==='config'?'btn-secondary':'btn-outline'} btn-sm" onclick="window.switchScheduleTab('config')">⚙️ Configurações</button>
        ${activeTab==='grade'?`
          <select id="sched-filter-cat" class="form-select" style="width:auto;" onchange="window.handleFilterSchedCat()">
            <option value="">Todas as Categorias</option>
            ${categories.map(c=>`<option value="${c.id}" ${c.id===filterCat?'selected':''}>${c.nome}</option>`).join('')}
          </select>`:''
        }
      </div>
    </div>

    ${activeTab==='config' ? renderConfigPanel() : `
      <!-- CARDS DOS DIAS -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.25rem;">
        ${[0,1,2,3].map(d => {
          const dayGames = allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === d);
          const phases   = [...new Set(dayGames.map(g=>g.fase))];
          const isActive = d === activeDay;
          const dt       = dayDates[d];
          return `<div onclick="window.switchScheduleDay(${d})" style="cursor:pointer;padding:.85rem 1rem;border-radius:10px;border:2px solid ${isActive?'var(--primary)':'var(--border-light)'};background:${isActive?'var(--primary-light)':'#fff'};transition:.15s;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-weight:800;font-size:.95rem;color:${isActive?'var(--primary)':'var(--accent-dark-blue)'};">Dia ${d+1}</span>
              <span style="font-size:.72rem;font-weight:700;color:${isActive?'var(--primary)':'#64748b'};background:${isActive?'var(--primary-light)':'#f1f5f9'};padding:.15rem .45rem;border-radius:999px;border:1px solid ${isActive?'var(--primary)':'#e2e8f0'};">${dt}</span>
            </div>
            <div style="font-size:.7rem;color:var(--text-muted);margin-top:.3rem;min-height:1.5em;">${phases.slice(0,2).join(' · ')||'—'}</div>
            <div style="font-size:1.45rem;font-weight:900;color:${isActive?'var(--primary)':'var(--accent-dark-blue)'};margin-top:.25rem;">${perDay[d]} <span style="font-size:.75rem;font-weight:600;">confrontos</span></div>
          </div>`;
        }).join('')}
      </div>

      <!-- LEGENDA -->
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.85rem;">
        ${categories.map(c=>{
          const col = CAT_COLORS[c.id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
          return `<span style="padding:.18rem .6rem;border-radius:999px;font-size:.7rem;font-weight:700;background:${col.bg};border:1px solid ${col.border};color:${col.text};">${PRIORITY_CATS.has(c.id)?'⭐ ':''}${c.nome}</span>`;
        }).join('')}
        <span style="padding:.18rem .6rem;border-radius:999px;font-size:.7rem;font-weight:600;background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;">💡 Arraste para reorganizar</span>
      </div>

      ${renderDayGrid(activeDay, categories, allGames, dayDates)}
    `}
  `;

  if (activeTab === 'grade') setupDragDrop();
}

// ─── Painel de Configurações ──────────────────────────────────────────────────
function renderConfigPanel() {
  return `
    <div class="card" style="max-width:540px;">
      <div class="card-header"><h3 class="card-title">⚙️ Configurações da Programação</h3></div>
      <div style="padding:1.25rem;display:flex;flex-direction:column;gap:1.1rem;">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem;">
          <div>
            <label class="form-label">🕗 Horário de Início</label>
            <div style="display:flex;align-items:center;gap:.4rem;">
              <input type="number" id="cfg-start-hour" class="form-control" min="5" max="12" value="${cfg.startHour}" style="width:80px;">
              <span style="color:var(--text-muted);">:00</span>
            </div>
          </div>
          <div>
            <label class="form-label">🕔 Horário de Término</label>
            <div style="display:flex;align-items:center;gap:.4rem;">
              <input type="number" id="cfg-end-hour" class="form-control" min="14" max="22" value="${cfg.endHour}" style="width:80px;">
              <span style="color:var(--text-muted);">:00</span>
            </div>
          </div>
          <div>
            <label class="form-label">⏱️ Duração por Confronto (min)</label>
            <input type="number" id="cfg-match-min" class="form-control" min="60" max="240" step="15" value="${cfg.matchMinutes}" style="width:100px;">
          </div>
          <div>
            <label class="form-label">🏟️ Número de Quadras</label>
            <input type="number" id="cfg-courts" class="form-control" min="1" max="30" value="${cfg.courts}" style="width:100px;">
          </div>
        </div>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.85rem;">
          <div style="font-weight:700;color:#166534;margin-bottom:.4rem;">📊 Capacidade calculada por dia:</div>
          <div style="font-size:.85rem;color:#166534;">
            ${(() => {
              const totalMin = (cfg.endHour - cfg.startHour) * 60;
              const slots    = Math.floor(totalMin / cfg.matchMinutes);
              const total    = slots * cfg.courts;
              return `${slots} rodadas de ${cfg.matchMinutes} min × ${cfg.courts} quadras = <strong>${total} confrontos/dia</strong>`;
            })()}
          </div>
        </div>

        <div>
          <div style="font-weight:700;color:var(--accent-dark-blue);margin-bottom:.5rem;">📅 Datas do Evento (altere em Configurações → Torneio)</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;">
            ${buildDayDates(store.getTournament().dataInicio).map((dt,i) => `
              <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.5rem;">
                <div style="font-weight:800;font-size:.8rem;">Dia ${i+1}</div>
                <div style="font-size:.75rem;color:#64748b;">${dt}</div>
              </div>`).join('')}
          </div>
        </div>

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:.75rem;font-size:.82rem;color:#92400e;">
          ⭐ <strong>Sub 12, Sub 14, +50 e +60</strong> são sempre alocadas nos primeiros horários disponíveis. As demais categorias preenchem os horários restantes.
        </div>

        <button class="btn btn-primary" onclick="window.saveSchedConfig()">💾 Salvar e Redistribuir</button>
      </div>
    </div>`;
}

// ─── Grid do dia ─────────────────────────────────────────────────────────────
function renderDayGrid(day, categories, allGames, dayDates) {
  let dayGames = allGames.filter(g => (g._schedDay ?? FASE_DAY_MAP[g.fase] ?? 0) === day);
  if (filterCat) dayGames = dayGames.filter(g => g.categoria_id === filterCat);

  const maxSlotMin = (cfg.endHour - cfg.startHour)*60 - cfg.matchMinutes;
  const allSlots   = [];
  for (let m = 0; m <= maxSlotMin; m += cfg.matchMinutes) allSlots.push(m);
  const allCourts  = Array.from({length:cfg.courts},(_,i)=>i+1);

  if (dayGames.length === 0) return `
    <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);background:#f8fafc;border-radius:12px;">
      <div style="font-size:2.5rem;margin-bottom:.5rem;">📭</div>
      <p style="margin:0;font-weight:600;">Nenhum confronto para ${DAY_NAMES[day]}.</p>
      <p style="margin:.5rem 0 0;font-size:.85rem;">Clique em <strong>⚡ Distribuir Automaticamente</strong>.</p>
    </div>`;

  const rows = allSlots.map((slotMin, si) => {
    const timeStr = minToTime(cfg.startHour*60+slotMin);
    const endStr  = minToTime(cfg.startHour*60+slotMin+cfg.matchMinutes);
    const rowBg   = si%2===0 ? '#f8fafc' : '#fff';
    const cells = allCourts.map(court => {
      const game = dayGames.find(g => (g._schedCourt??1)===court && (g._schedSlotMin??0)===slotMin);
      if (!game) return `
        <td style="padding:.3rem;border:1px solid #f1f5f9;background:${rowBg};min-width:115px;">
          <div class="sched-drop-zone" data-court="${court}" data-slot="${slotMin}" data-day="${day}"
            style="min-height:62px;border:2px dashed #e2e8f0;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:.65rem;">soltar</div>
        </td>`;
      const col = CAT_COLORS[game.categoria_id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
      const catName = categories.find(c=>c.id===game.categoria_id)?.nome||game.categoria_id;
      const isPrio  = PRIORITY_CATS.has(game.categoria_id);
      const byesList = store.getCategoryByes(game.categoria_id);
      const rankA = byesList.indexOf(game.lado_a?.id)+1;
      const rankB = game.lado_b ? byesList.indexOf(game.lado_b.id)+1 : 0;
      return `
        <td style="padding:.3rem;border:1px solid #f1f5f9;vertical-align:top;min-width:115px;">
          <div class="sched-game-card" draggable="true"
            data-code="${game.code}" data-cat="${game.categoria_id}"
            data-court="${game._schedCourt??1}" data-slot="${game._schedSlotMin??0}" data-day="${day}"
            style="cursor:grab;padding:.42rem .5rem;border-radius:7px;border:1.5px solid ${col.border};background:${col.bg};min-height:62px;user-select:none;position:relative;">
            ${isPrio?`<span style="position:absolute;top:2px;right:3px;font-size:.58rem;">⭐</span>`:''}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.18rem;padding-right:.75rem;">
              <span style="font-weight:800;font-size:.66rem;color:${col.text};">${game.code}</span>
              <span style="font-size:.52rem;font-weight:700;padding:.08rem .22rem;border-radius:3px;background:${col.border};color:#fff;">${catName}</span>
            </div>
            <div style="font-size:.73rem;font-weight:700;color:#1e293b;">${rankA>0?`<span style="color:${col.border};font-size:.6rem;font-weight:800;">#${rankA} </span>`:''}${game.lado_a?.uf||'?'}</div>
            <div style="font-size:.62rem;color:#64748b;margin:.05rem 0;">vs</div>
            <div style="font-size:.73rem;font-weight:700;color:#1e293b;">${rankB>0?`<span style="color:${col.border};font-size:.6rem;font-weight:800;">#${rankB} </span>`:''}${game.lado_b?.uf||'?'}</div>
            <div style="font-size:.56rem;color:#94a3b8;margin-top:.18rem;">${game.fase}</div>
          </div>
        </td>`;
    }).join('');
    return `<tr style="background:${rowBg};">
      <td style="padding:.5rem .65rem;font-weight:700;font-size:.78rem;white-space:nowrap;color:#475569;border-right:2px solid #e2e8f0;vertical-align:middle;">
        ${timeStr}<br><span style="font-size:.63rem;color:#94a3b8;font-weight:400;">até ${endStr}</span>
      </td>${cells}</tr>`;
  }).join('');

  const headCells = allCourts.map(c=>`<th style="padding:.45rem .38rem;background:#1e293b;color:#fff;font-size:.7rem;text-align:center;white-space:nowrap;min-width:115px;">Q.${c}</th>`).join('');

  // Lista detalhada
  const sorted = dayGames.slice().sort((a,b)=>(a._schedSlotMin??0)-(b._schedSlotMin??0)||(a._schedCourt??0)-(b._schedCourt??0));
  const list = sorted.map(g=>{
    const col = CAT_COLORS[g.categoria_id]||{bg:'#f1f5f9',border:'#94a3b8',text:'#1e293b'};
    const catName = categories.find(c=>c.id===g.categoria_id)?.nome||g.categoria_id;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:.55rem .9rem;border:1px solid ${col.border};border-radius:8px;background:${col.bg};">
      <div style="display:flex;align-items:center;gap:.7rem;">
        <span style="font-weight:800;font-size:.8rem;color:${col.text};min-width:52px;">${PRIORITY_CATS.has(g.categoria_id)?'⭐ ':''}${g.code}</span>
        <div>
          <div style="font-weight:700;font-size:.87rem;color:#1e293b;">${g.lado_a?.nome} (${g.lado_a?.uf}) vs ${g.lado_b?.nome} (${g.lado_b?.uf})</div>
          <div style="font-size:.72rem;color:#64748b;">${catName} · ${g.fase}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.85rem;flex-shrink:0;">
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:.87rem;color:${col.text};">🏟️ Q.${g._schedCourt??'?'}</div>
          <div style="font-size:.72rem;color:#64748b;">🕒 ${g._schedTime||'--:--'}</div>
        </div>
        <span class="badge-status ${g.status}" style="font-size:.6rem;">${g.status}</span>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="overflow-x:auto;margin-bottom:1.5rem;">
      <table style="border-collapse:collapse;width:100%;min-width:${100+cfg.courts*118}px;">
        <thead><tr>
          <th style="padding:.45rem .65rem;background:#1e293b;color:#fff;font-size:.76rem;text-align:left;white-space:nowrap;min-width:82px;">⏰ Horário</th>
          ${headCells}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <h4 style="font-family:var(--font-display);color:var(--accent-dark-blue);margin:0 0 .7rem;">
      📋 Lista — ${DAY_NAMES[day]} / ${dayDates[day]} (${dayGames.length} confrontos)
    </h4>
    <div style="display:flex;flex-direction:column;gap:.42rem;">${list||'<p style="color:var(--text-muted);">Nenhum jogo neste dia.</p>'}</div>`;
}

// ─── Auto-distribuição ────────────────────────────────────────────────────────
function autoDistribute() {
  const allGames = getEligibleGames();
  const maxSlotMin = (cfg.endHour - cfg.startHour)*60 - cfg.matchMinutes;

  [0,1,2,3].forEach(day => {
    const dayGames = allGames.filter(g => (FASE_DAY_MAP[g.fase] ?? 3) === day);
    const priority = dayGames.filter(g =>  PRIORITY_CATS.has(g.categoria_id)).sort(byPhase);
    const normal   = dayGames.filter(g => !PRIORITY_CATS.has(g.categoria_id)).sort(byPhase);
    const occupied = new Set();

    const place = (game) => {
      for (let slotMin = 0; slotMin <= maxSlotMin; slotMin += cfg.matchMinutes) {
        for (let court = 1; court <= cfg.courts; court++) {
          const key = `${court}_${slotMin}`;
          if (!occupied.has(key)) {
            occupied.add(key);
            game._schedDay     = day;
            game._schedCourt   = court;
            game._schedSlotMin = slotMin;
            game._schedTime    = minToTime(cfg.startHour*60+slotMin);
            return;
          }
        }
      }
      game._schedDay=day; game._schedCourt=cfg.courts; game._schedSlotMin=maxSlotMin; game._schedTime=minToTime(cfg.startHour*60+maxSlotMin);
    };

    priority.forEach(place);
    normal.forEach(place);
  });
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
function setupDragDrop() {
  document.querySelectorAll('.sched-game-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      _dragData = {code:card.dataset.code, cat:card.dataset.cat, court:+card.dataset.court, slot:+card.dataset.slot, day:+card.dataset.day};
      card.style.opacity = '.38';
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => { card.style.opacity='1'; });

    card.addEventListener('dragover', e => { e.preventDefault(); card.style.boxShadow='0 0 0 3px #3b82f6'; });
    card.addEventListener('dragleave',()=>{ card.style.boxShadow=''; });
    card.addEventListener('drop', e => {
      e.preventDefault(); card.style.boxShadow='';
      if (!_dragData || _dragData.code===card.dataset.code) return;
      const all = getEligibleGames();
      const src = all.find(g=>g.code===_dragData.code && g.categoria_id===_dragData.cat);
      const dst = all.find(g=>g.code===card.dataset.code && g.categoria_id===card.dataset.cat);
      if (src && dst) {
        [src._schedCourt,dst._schedCourt]     = [dst._schedCourt,src._schedCourt];
        [src._schedSlotMin,dst._schedSlotMin] = [dst._schedSlotMin,src._schedSlotMin];
        [src._schedDay,dst._schedDay]         = [dst._schedDay,src._schedDay];
        [src._schedTime,dst._schedTime]       = [dst._schedTime,src._schedTime];
      }
      _dragData=null; renderSchedule();
    });
  });

  document.querySelectorAll('.sched-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.style.background='#dbeafe'; zone.style.borderColor='#3b82f6'; zone.style.color='#1d4ed8';
    });
    zone.addEventListener('dragleave',()=>{
      zone.style.background=''; zone.style.borderColor='#e2e8f0'; zone.style.color='#d1d5db';
    });
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.style.background=''; zone.style.borderColor='#e2e8f0';
      if (!_dragData) return;
      const game = getEligibleGames().find(g=>g.code===_dragData.code && g.categoria_id===_dragData.cat);
      if (game) {
        game._schedDay=+zone.dataset.day; game._schedCourt=+zone.dataset.court;
        game._schedSlotMin=+zone.dataset.slot;
        game._schedTime=minToTime(cfg.startHour*60+(+zone.dataset.slot));
      }
      _dragData=null; renderSchedule();
    });
  });
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function getEligibleGames() {
  return store.getAllGames().filter(g => !g.is_bye && g.lado_a && g.lado_b);
}

function buildDayDates(dataInicio) {
  const base = dataInicio ? new Date(dataInicio+'T12:00:00') : new Date();
  return [0,1,2,3].map(i => {
    const d = new Date(base); d.setDate(d.getDate()+i);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  });
}

function byPhase(a,b) { return PHASE_ORDER.indexOf(a.fase)-PHASE_ORDER.indexOf(b.fase); }

function minToTime(totalMin) {
  return pad(Math.floor(totalMin/60))+':'+pad(totalMin%60);
}

function pad(n) { return n.toString().padStart(2,'0'); }

const DAY_NAMES = ['Dia 1','Dia 2','Dia 3','Dia 4'];
