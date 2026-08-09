export class CaveGenerator {
  public cols: number;
  public rows: number;
  public tileSize: number;
  public grid: number[][];

  constructor(cols: number = 60, rows: number = 40, tileSize: number = 20) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.grid = [];
  }

  public generate(fillPercent: number = 0.45, iterations: number = 5): void {
    // 1. Initialize random grid
    this.grid = Array.from({ length: this.cols }, (_, x) =>
      Array.from({ length: this.rows }, (_, y) => {
        if (x === 0 || x === this.cols - 1 || y === 0 || y === this.rows - 1) {
          return 1; // Border walls
        }
        return Math.random() < fillPercent ? 1 : 0;
      })
    );

    // 2. Cellular automata smoothing
    for (let i = 0; i < iterations; i++) {
      this.smoothGrid();
    }

    // 3. Flood fill to keep only largest cavern
    this.cleanIsolatedCaverns();
  }

  private smoothGrid(): void {
    const newGrid: number[][] = Array.from({ length: this.cols }, () => new Array(this.rows).fill(0));

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (x === 0 || x === this.cols - 1 || y === 0 || y === this.rows - 1) {
          newGrid[x]![y] = 1;
          continue;
        }

        const wallCount = this.getNeighbourWallCount(x, y);
        if (wallCount > 4) {
          newGrid[x]![y] = 1;
        } else if (wallCount < 4) {
          newGrid[x]![y] = 0;
        } else {
          newGrid[x]![y] = this.grid[x]![y]!;
        }
      }
    }

    this.grid = newGrid;
  }

  private getNeighbourWallCount(gridX: number, gridY: number): number {
    let count = 0;
    for (let nx = gridX - 1; nx <= gridX + 1; nx++) {
      for (let ny = gridY - 1; ny <= gridY + 1; ny++) {
        if (nx === gridX && ny === gridY) continue;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
          count++;
        } else if (this.grid[nx]![ny] === 1) {
          count++;
        }
      }
    }
    return count;
  }

  private cleanIsolatedCaverns(): void {
    const visited = Array.from({ length: this.cols }, () => new Array(this.rows).fill(false));
    let largestRoom: { x: number; y: number }[] = [];

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (this.grid[x]![y] === 0 && !visited[x]![y]) {
          const room = this.floodFill(x, y, visited);
          if (room.length > largestRoom.length) {
            largestRoom = room;
          }
        }
      }
    }

    // Convert everything except largest room to walls
    const largestRoomSet = new Set(largestRoom.map((p) => `${p.x},${p.y}`));
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (this.grid[x]![y] === 0 && !largestRoomSet.has(`${x},${y}`)) {
          this.grid[x]![y] = 1;
        }
      }
    }
  }

  private floodFill(startX: number, startY: number, visited: boolean[][]): { x: number; y: number }[] {
    const room: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    visited[startX]![startY] = true;

    while (queue.length > 0) {
      const tile = queue.pop()!;
      room.push(tile);

      const dirs = [
        { x: tile.x + 1, y: tile.y },
        { x: tile.x - 1, y: tile.y },
        { x: tile.x, y: tile.y + 1 },
        { x: tile.x, y: tile.y - 1 },
      ];

      for (const d of dirs) {
        if (
          d.x >= 0 &&
          d.x < this.cols &&
          d.y >= 0 &&
          d.y < this.rows &&
          !visited[d.x]![d.y] &&
          this.grid[d.x]![d.y] === 0
        ) {
          visited[d.x]![d.y] = true;
          queue.push(d);
        }
      }
    }

    return room;
  }

  public getFreeSpawnPoint(): { x: number; y: number } {
    const freeTiles: { x: number; y: number }[] = [];
    for (let x = 1; x < this.cols - 1; x++) {
      for (let y = 1; y < this.rows - 1; y++) {
        if (this.grid[x]![y] === 0) {
          freeTiles.push({
            x: (x + 0.5) * this.tileSize,
            y: (y + 0.5) * this.tileSize,
          });
        }
      }
    }
    if (freeTiles.length === 0) {
      return { x: (this.cols * this.tileSize) / 2, y: (this.rows * this.tileSize) / 2 };
    }
    return freeTiles[Math.floor(Math.random() * freeTiles.length)]!;
  }

  public isWall(worldX: number, worldY: number): boolean {
    const gridX = Math.floor(worldX / this.tileSize);
    const gridY = Math.floor(worldY / this.tileSize);
    if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) {
      return true;
    }
    return this.grid[gridX]![gridY] === 1;
  }
}
