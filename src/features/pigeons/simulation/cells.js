export function initCells(N, density = 0.15) {
  const grid = [];
  for (let y = 0; y < N; y++) {
    grid[y] = [];
    for (let x = 0; x < N; x++) {
      grid[y][x] = Math.random() < density ? 1 : 0;
    }
  }
  return grid;
}

export function stepCells(prevGrid) {
  const N = prevGrid.length;
  const next = [];

  for (let y = 0; y < N; y++) {
    next[y] = [];
    for (let x = 0; x < N; x++) {
      const alive = prevGrid[y][x] === 1;
      const neighbors = countNeighbors(prevGrid, x, y);
      // règles à adapter
      if (alive && (neighbors === 2 || neighbors === 3)) next[y][x] = 1;
      else if (!alive && neighbors === 3) next[y][x] = 1;
      else next[y][x] = 0;
    }
  }
  return next;
}

function countNeighbors(grid, x, y) {
  const N = grid.length;
  let count = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      if (i === 0 && j === 0) continue;
      const nx = (x + i + N) % N;
      const ny = (y + j + N) % N;
      count += grid[ny][nx];
    }
  }
  return count;
}