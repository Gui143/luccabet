// ============================================================================
// Motor de caça-níquel "tumble" / "pay anywhere" — estilo Pragmatic Play
// Usado por Sweet Bonanza e Gates of Olympus.
// Grade 6 colunas x 5 linhas. Símbolos pagam em qualquer lugar a partir de
// 8+ iguais na tela. Símbolos vencedores explodem, os de cima caem e novos
// entram (tumble). Multiplicadores especiais multiplicam o ganho da rodada.
// 4+ scatters dão giros grátis.
// ============================================================================

export interface SlotSymbolDef {
  id: string;
  /** multiplicador da aposta para 8-9 / 10-11 / 12+ símbolos */
  pay: [number, number, number];
  /** aparece na grade normal */
  payable: boolean;
}

export interface SlotConfig {
  gameKey: string;
  cols: number;
  rows: number;
  symbols: SlotSymbolDef[];
  scatterId: string;
  multiplierId: string;
  /** multiplicadores possíveis da bomba/orbe (ex.: [2, 3, 5, 10, 25, 50, 100]) */
  multiplierValues: number[];
  /** pagamentos de scatter: 4 / 5 / 6 */
  scatterPay: [number, number, number];
  freeSpinsCount: number;
  retriggerScatters: number;
  /** Sweet Bonanza: bombas só valem na rodada de bônus. Gates: valem sempre. */
  multiplierOnlyInBonus: boolean;
}

export type Cell = {
  key: number; // id único para animação
  sym: string | null; // null = vazio (durante o tombo)
  mult?: number; // valor do multiplicador se for uma célula multiplicadora
} | null;

export type Grid = Cell[][]; // grid[col][row]

export interface TumbleStep {
  grid: Grid;
  winCells: number[]; // índices lineares das células que formam a vitória
  winAmount: number; // ganho deste tumble (já contabilizando multiplicadores no fim)
  multipliers: { index: number; value: number }[];
}

export interface SpinResult {
  steps: TumbleStep[];
  totalWin: number; // em unidades de aposta (já com multiplicador quando aplicável)
  baseWin: number; // ganho sem o multiplicador das bombas/orbes
  totalMultiplier: number; // soma dos multiplicadores da rodada
  scatterCount: number;
  freeSpinsTriggered: boolean;
  scatterWin: number;
}

let keyCounter = 1;
export const newCell = (sym: string): Cell => ({ key: keyCounter++, sym });

export const makeEmptyGrid = (cols: number, rows: number): Grid =>
  Array.from({ length: cols }, () => Array.from({ length: rows }, () => null));

export const randomPayableSym = (cfg: SlotConfig): string => {
  const pool = cfg.symbols.filter(s => s.payable);
  return pool[Math.floor(Math.random() * pool.length)].id;
};

/** Grade aleatória sem scatters e sem multiplicadores (usada nos reabastecimentos) */
export const randomGrid = (cfg: SlotConfig): Grid =>
  Array.from({ length: cfg.cols }, () =>
    Array.from({ length: cfg.rows }, () => newCell(randomPayableSym(cfg)))
  );

const cloneGrid = (g: Grid): Grid => g.map(col => col.map(c => (c ? { ...c } : null)));

const linearIndex = (cfg: SlotConfig, col: number, row: number) => col * cfg.rows + row;

/** Conta símbolos conectados (cluster 8-directional) do mesmo id */
const findClusters = (cfg: SlotConfig, grid: Grid): Map<string, number[]> => {
  const clusters = new Map<string, number[]>();
  const visited = new Set<number>();

  for (let c = 0; c < cfg.cols; c++) {
    for (let r = 0; r < cfg.rows; r++) {
      const cell = grid[c][r];
      if (!cell || !cell.sym) continue;
      const def = cfg.symbols.find(s => s.id === cell.sym);
      if (!def || !def.payable) continue;

      const start = linearIndex(cfg, c, r);
      if (visited.has(start)) continue;

      // BFS
      const group: number[] = [];
      const queue: [number, number][] = [[c, r]];
      const localVisited = new Set<number>([start]);
      while (queue.length) {
        const [cc, rr] = queue.shift()!;
        const idx = linearIndex(cfg, cc, rr);
        if (visited.has(idx)) continue;
        group.push(idx);
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (dc === 0 && dr === 0) continue;
            const nc = cc + dc;
            const nr = rr + dr;
            if (nc < 0 || nc >= cfg.cols || nr < 0 || nr >= cfg.rows) continue;
            const nIdx = linearIndex(cfg, nc, nr);
            if (localVisited.has(nIdx)) continue;
            const nCell = grid[nc][nr];
            if (nCell && nCell.sym === cell.sym) {
              localVisited.add(nIdx);
              queue.push([nc, nr]);
            }
          }
        }
      }
      group.forEach(i => visited.add(i));
      if (group.length >= 8) {
        clusters.set(cell.sym + '#' + start, group);
      }
    }
  }
  return clusters;
};

const payForCount = (cfg: SlotConfig, symId: string, count: number): number => {
  const def = cfg.symbols.find(s => s.id === symId);
  if (!def) return 0;
  if (count >= 12) return def.pay[2];
  if (count >= 10) return def.pay[1];
  return def.pay[0];
};

/** Conta scatters na grade */
export const countScatters = (cfg: SlotConfig, grid: Grid): number => {
  let n = 0;
  for (const col of grid) for (const cell of col) if (cell && cell.sym === cfg.scatterId) n++;
  return n;
};

/** Remove células vencedoras, faz os símbolos caírem e preenche o topo */
const collapseGrid = (cfg: SlotConfig, grid: Grid, removed: Set<number>): Grid => {
  const next = makeEmptyGrid(cfg.cols, cfg.rows);
  for (let c = 0; c < cfg.cols; c++) {
    // mantém células que não foram removidas, empilhando de baixo para cima
    const kept = grid[c].filter((cell, r) => cell && !removed.has(linearIndex(cfg, c, r)));
    const writeRow = cfg.rows - 1;
    for (let i = 0; i < kept.length; i++) {
      next[c][writeRow - i] = { ...kept[kept.length - 1 - i]! };
    }
    // preenche os espaços vazios do topo com símbolos novos
    for (let r = 0; r < cfg.rows; r++) {
      if (!next[c][r]) next[c][r] = newCell(randomPayableSym(cfg));
    }
  }
  return next;
};

/** Coloca multiplicadores (bomba/orbe) em células aleatórias da grade */
const placeMultipliers = (cfg: SlotConfig, grid: Grid): { grid: Grid; placed: { index: number; value: number }[] } => {
  const placed: { index: number; value: number }[] = [];
  // chance de surgir 1 multiplicador numa tela
  if (Math.random() < 0.28) {
    const empties: [number, number][] = [];
    for (let c = 0; c < cfg.cols; c++) {
      for (let r = 0; r < cfg.rows; r++) {
        const cell = grid[c][r];
        if (cell && cell.sym && cfg.symbols.find(s => s.id === cell.sym)?.payable) {
          empties.push([c, r]);
        }
      }
    }
    if (empties.length) {
      const [c, r] = empties[Math.floor(Math.random() * empties.length)];
      const value = cfg.multiplierValues[Math.floor(Math.random() * cfg.multiplierValues.length)];
      grid[c][r] = { key: keyCounter++, sym: cfg.multiplierId, mult: value };
      placed.push({ index: linearIndex(cfg, c, r), value });
    }
  }
  return { grid, placed };
};

interface BuildOptions {
  favor: boolean; // true = rodada deve favorecer o jogador (% do painel admin)
  bonus: boolean; // true = giro de bônus (giros grátis)
}

/** Constrói uma grade inicial forçando o resultado conforme a % configurada */
const buildInitialGrid = (cfg: SlotConfig, opts: BuildOptions): Grid => {
  const { favor, bonus } = opts;

  // No bônus o jogador já está ganhando — grades naturais, sempre com chance de multiplicador
  if (bonus) {
    const grid = randomGrid(cfg);
    return grid;
  }

  if (favor) {
    // 18% de chance de acionar giros grátis no jogo base
    if (Math.random() < 0.18) {
      const grid = randomGrid(cfg);
      const positions: [number, number][] = [];
      for (let c = 0; c < cfg.cols; c++) for (let r = 0; r < cfg.rows; r++) positions.push([c, r]);
      // embaralha
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      const nScatter = 4 + Math.floor(Math.random() * 3); // 4-6
      for (let i = 0; i < nScatter; i++) {
        const [c, r] = positions[i];
        grid[c][r] = newCell(cfg.scatterId);
      }
      return grid;
    }

    // Garante um cluster pagante: escolhe um símbolo (premium com peso menor)
    const payable = cfg.symbols.filter(s => s.payable);
    const sym = payable[Math.floor(Math.random() * payable.length)];
    for (let attempt = 0; attempt < 60; attempt++) {
      const grid = randomGrid(cfg);
      const target = 8 + Math.floor(Math.random() * 6); // 8-13
      const positions: [number, number][] = [];
      for (let c = 0; c < cfg.cols; c++) for (let r = 0; r < cfg.rows; r++) positions.push([c, r]);
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      // agrupa as posições sorteadas para formar um cluster conectado
      const cluster: [number, number][] = [positions[0]];
      const used = new Set([positions[0].join(',')]);
      while (cluster.length < target) {
        const base = cluster[Math.floor(Math.random() * cluster.length)];
        const neigh: [number, number][] = [];
        for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          const nc = base[0] + dc;
          const nr = base[1] + dr;
          if (nc < 0 || nc >= cfg.cols || nr < 0 || nr >= cfg.rows) continue;
          if (!used.has(nc + ',' + nr)) neigh.push([nc, nr]);
        }
        if (!neigh.length) break;
        const pick = neigh[Math.floor(Math.random() * neigh.length)];
        used.add(pick.join(','));
        cluster.push(pick);
      }
      cluster.forEach(([c, r]) => { grid[c][r] = newCell(sym.id); });
      // valida
      const found = findClusters(cfg, grid);
      let total = 0;
      found.forEach(group => { total += group.length; });
      if (total >= 8) return grid;
    }
    // fallback — grade aleatória (ainda pode pagar naturalmente)
    return randomGrid(cfg);
  }

  // Casa favorecida: gera grades até que NÃO haja vitória e não haja scatters
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = randomGrid(cfg);
    if (findClusters(cfg, grid).size === 0 && countScatters(cfg, grid) === 0) return grid;
  }
  return randomGrid(cfg);
};

/**
 * Resolve um giro completo (todos os tumbles) e retorna os passos para animação.
 */
export const simulateSpin = (cfg: SlotConfig, favor: boolean, bonus: boolean): SpinResult => {
  let grid = buildInitialGrid(cfg, { favor, bonus });

  const steps: TumbleStep[] = [];
  let totalWin = 0;
  let totalMultiplier = 0;
  const seenMultiplierKeys = new Set<number>();

  // Multiplicadores: Gates podem surgir em qualquer tela; Sweet só no bônus
  const multipliersActive = bonus || !cfg.multiplierOnlyInBonus;

  let tumble = 0;
  const maxTumbles = 12;

  // scatters da grade inicial (gatilho de bônus)
  const scatterCount = countScatters(cfg, grid);

  while (tumble < maxTumbles) {
    const clusters = findClusters(cfg, grid);
    if (clusters.size === 0) break;

    const removed = new Set<number>();
    let stepWin = 0;
    const stepWinCells: number[] = [];
    clusters.forEach((group, key) => {
      const symId = key.split('#')[0];
      stepWin += payForCount(cfg, symId, group.length);
      group.forEach(i => { removed.add(i); stepWinCells.push(i); });
    });

    // coloca multiplicadores nesta tela (permanecem até o fim dos tumbles)
    const stepMultipliers: { index: number; value: number }[] = [];
    if (multipliersActive && stepWin > 0) {
      const res = placeMultipliers(cfg, grid);
      grid = res.grid;
      res.placed.forEach(p => {
        const [c, r] = [Math.floor(p.index / cfg.rows), p.index % cfg.rows];
        // não remove células multiplicadoras
        removed.delete(p.index);
        const cell = grid[c][r];
        if (cell && !seenMultiplierKeys.has(cell.key)) {
          seenMultiplierKeys.add(cell.key);
          totalMultiplier += p.value;
          stepMultipliers.push(p);
        }
      });
    }

    steps.push({
      grid: cloneGrid(grid),
      winCells: stepWinCells,
      winAmount: stepWin,
      multipliers: stepMultipliers,
    });
    totalWin += stepWin;

    // colapsa
    grid = collapseGrid(cfg, grid, removed);
    tumble++;
  }

  // grade final sem vitória
  steps.push({ grid: cloneGrid(grid), winCells: [], winAmount: 0, multipliers: [] });

  // Sweet Bonanza (multiplierOnlyInBonus): bombas aparecem só no bônus e
  // sempre se aplicam na hora. Gates of Olympus: no jogo base aplica na
  // hora; no bônus os orbes se acumulam e são aplicados no total ao fim.
  const applyThisSpin = cfg.multiplierOnlyInBonus || !bonus;
  if (totalMultiplier > 0 && totalWin > 0 && applyThisSpin) {
    const m = totalMultiplier;
    let acc = 0;
    for (const step of steps) {
      if (step.winAmount > 0) {
        acc += step.winAmount;
        step.winAmount = +(step.winAmount * m).toFixed(2);
      }
    }
    totalWin = +(acc * m).toFixed(2);
  }

  // Pagamento de scatter
  let scatterWin = 0;
  if (!bonus && scatterCount >= 4) {
    const idx = Math.min(scatterCount, 6) - 4;
    scatterWin = cfg.scatterPay[idx];
    totalWin += scatterWin;
  }

  const freeSpinsTriggered = !bonus && scatterCount >= 4;
  const retrigger = bonus && scatterCount >= cfg.retriggerScatters;

  // baseWin = ganho do giro sem o multiplicador das bombas/orbes
  const baseWin = totalMultiplier > 0 && totalWin > 0 && applyThisSpin
    ? +(totalWin / totalMultiplier).toFixed(2)
    : totalWin;

  return {
    steps,
    totalWin,
    baseWin,
    totalMultiplier,
    scatterCount,
    freeSpinsTriggered: freeSpinsTriggered || retrigger,
    scatterWin,
  };
};

// ============================================================================
// Configurações dos jogos
// ============================================================================

export const SWEET_BONANZA: SlotConfig = {
  gameKey: 'sweet_bonanza',
  cols: 6,
  rows: 5,
  multiplierOnlyInBonus: true,
  freeSpinsCount: 10,
  retriggerScatters: 3,
  scatterId: 'lollipop',
  multiplierId: 'bomb',
  scatterPay: [3, 5, 100],
  multiplierValues: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100],
  symbols: [
    // frutas (pagam menos)
    { id: 'banana', payable: true, pay: [0.5, 0.8, 1.2] },
    { id: 'grape', payable: true, pay: [0.5, 1, 1.5] },
    { id: 'watermelon', payable: true, pay: [0.8, 1.2, 2] },
    { id: 'citrus', payable: true, pay: [1, 1.5, 2.5] },
    { id: 'apple', payable: true, pay: [1, 1.5, 2.5] },
    { id: 'candy-blue', payable: true, pay: [1.5, 2, 5] },
    { id: 'candy-green', payable: true, pay: [2, 3, 8] },
    // doces premium
    { id: 'heart', payable: true, pay: [5, 10, 25] },
    // especiais (não pagam como símbolo normal)
    { id: 'lollipop', payable: false, pay: [0, 0, 0] },
    { id: 'bomb', payable: false, pay: [0, 0, 0] },
  ],
};

export const GATES_OF_OLYMPUS: SlotConfig = {
  gameKey: 'gates_olympus',
  cols: 6,
  rows: 5,
  multiplierOnlyInBonus: false,
  freeSpinsCount: 15,
  retriggerScatters: 3,
  scatterId: 'zeus',
  multiplierId: 'orb',
  scatterPay: [3, 5, 100],
  multiplierValues: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500],
  symbols: [
    // pedras coloridas (menores)
    { id: 'gem-teal', payable: true, pay: [0.5, 0.8, 1.2] },
    { id: 'gem-blue', payable: true, pay: [0.6, 1, 1.5] },
    { id: 'gem-green', payable: true, pay: [0.8, 1.2, 2] },
    { id: 'gem-purple', payable: true, pay: [1, 1.5, 2.5] },
    { id: 'gem-red', payable: true, pay: [1.2, 2, 3] },
    { id: 'gem-yellow', payable: true, pay: [1.5, 2.5, 4] },
    // artefatos premium
    { id: 'ring-gold', payable: true, pay: [2, 3, 6] },
    { id: 'hourglass', payable: true, pay: [2.5, 4, 8] },
    { id: 'crown', payable: true, pay: [5, 10, 25] },
    // especiais
    { id: 'zeus', payable: false, pay: [0, 0, 0] },
    { id: 'orb', payable: false, pay: [0, 0, 0] },
  ],
};
