export function makeEmptyGrid(N) {
  return new Uint8Array(N * N);
}

export function randomizeGrid(N, density = 0.25) {
  const grid = makeEmptyGrid(N);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < density ? 1 : 0;
  }
  return grid;
}

function idx(x, y, N) {
  return ((y + N) % N) * N + ((x + N) % N);
}

//règle type  du Game of Life
export function stepGrid(curr, next, N) {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          count += curr[idx(x + dx, y + dy, N)];
        }
      }

      const i = idx(x, y, N);
      const alive = curr[i];

      //règle classique
      if (alive) {
        next[i] = count === 2 || count === 3 ? 1 : 0;
      } else {
        next[i] = count === 3 ? 1 : 0;
      }
    }
  }
}
