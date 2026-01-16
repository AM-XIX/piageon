export const POLITICS = {
  EMPTY: 0,
  C_RED: 1,
  F_GREEN: 2,
  M_YELLOW: 3,
  D_BLUE: 4,
  N_NEUTRAL: 5,
  A_PURPLE: 6,
};

let ageMap = null;

export function makeEmptyGrid(N) {
  return new Uint8Array(N * N);
}

export function randomizeGrid(N, density = 0.25) {
  const grid = makeEmptyGrid(N);
  ageMap = new Uint32Array(N * N).fill(0);
  
  for (let i = 0; i < grid.length; i++) {
    if (Math.random() < density) {
      grid[i] = 1 + Math.floor(Math.random() * 6);
    } else {
      grid[i] = POLITICS.EMPTY;
    }
  }
  return grid;
}

function idx(x, y, N) {
  return ((y + N) % N) * N + ((x + N) % N);
}

export function stepGrid(curr, next, N) {
  if (!ageMap) ageMap = new Uint32Array(N * N).fill(0);
  const nextAgeMap = new Uint32Array(N * N);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = idx(x, y, N);
      const type = curr[i];
      const count = [0, 0, 0, 0, 0, 0, 0];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          count[curr[idx(x + dx, y + dy, N)]]++;
        }
      }

      let newType = type;
      let newAge = ageMap[i] + 1;

      /* SECTION : LOGIQUE DE SURVIE ET VIEILLESSE */
      if (type !== POLITICS.EMPTY) {
        if (type === POLITICS.N_NEUTRAL && ageMap[i] >= 10) newType = POLITICS.EMPTY;
        if (ageMap[i] >= 15) newType = POLITICS.EMPTY;
      }

      if (newType !== POLITICS.EMPTY) {
        switch (type) {
          case POLITICS.C_RED:
            if (count[POLITICS.M_YELLOW] > 1 || count[POLITICS.F_GREEN] >= 2) newType = POLITICS.EMPTY;
            else if (count[POLITICS.C_RED] < 2 || count[POLITICS.C_RED] > 4) newType = POLITICS.EMPTY;
            break;
          case POLITICS.F_GREEN:
            if (count[POLITICS.D_BLUE] > 1) newType = POLITICS.EMPTY;
            if (count[POLITICS.F_GREEN] !== 2 && count[POLITICS.F_GREEN] !== 3) newType = POLITICS.EMPTY;
            break;
          case POLITICS.M_YELLOW:
            if (count[POLITICS.C_RED] >= 1 || count[POLITICS.M_YELLOW] >= 3) newType = POLITICS.EMPTY;
            break;
          case POLITICS.D_BLUE:
            if (count[POLITICS.F_GREEN] >= 2 || count[POLITICS.D_BLUE] < 2) newType = POLITICS.EMPTY;
            break;
          case POLITICS.A_PURPLE:
            if (count[POLITICS.M_YELLOW] >= 3 || (count[6] !== 1 && count[6] !== 2)) newType = POLITICS.EMPTY;
            break;
        }
      }

      /* SECTION : NAISSANCES */
      if (newType === POLITICS.EMPTY && Math.random() < 0.04) {
        newType = 1 + Math.floor(Math.random() * 6);
        newAge = 0;
      }

      next[i] = newType;
      nextAgeMap[i] = newType === POLITICS.EMPTY ? 0 : newAge;
    }
  }
  ageMap.set(nextAgeMap);
}