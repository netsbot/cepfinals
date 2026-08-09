/**
 * Rust-style Generational Entity Index.
 * Upper 12 bits = generation, lower 20 bits = index slot.
 * Max entities = 1,048,575. Max generations per slot = 4,095.
 */
export type Entity = number & { readonly __brand: unique symbol };

const INDEX_BITS = 20;
const INDEX_MASK = (1 << INDEX_BITS) - 1;
const MAX_GENERATION = 0xfff;

export class EntityAllocator {
  private generations: Uint16Array;
  private freeIndices: number[] = [];
  private nextIndex = 1; // Index 0 reserved for null handle safety
  private aliveCount = 0;

  constructor(maxEntities: number = 100000) {
    this.generations = new Uint16Array(maxEntities);
  }

  public allocate(): Entity {
    let index: number;
    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else {
      index = this.nextIndex++;
      if (index >= this.generations.length) {
        throw new Error(`[ECS] Entity pool exhausted! Max capacity: ${this.generations.length}`);
      }
    }

    const gen = this.generations[index]!;
    this.aliveCount++;
    return ((gen << INDEX_BITS) | index) as Entity;
  }

  public deallocate(entity: Entity): boolean {
    const index = entity & INDEX_MASK;
    const gen = (entity >>> INDEX_BITS) & MAX_GENERATION;

    if (this.generations[index] !== gen) {
      // Stale handle / double free
      return false;
    }

    // Bump generation for slot reuse safety
    this.generations[index] = (gen + 1) & MAX_GENERATION;
    this.freeIndices.push(index);
    this.aliveCount--;
    return true;
  }

  public isAlive(entity: Entity): boolean {
    const index = entity & INDEX_MASK;
    const gen = (entity >>> INDEX_BITS) & MAX_GENERATION;
    return index < this.nextIndex && this.generations[index] === gen;
  }

  public static getIndex(entity: Entity): number {
    return entity & INDEX_MASK;
  }

  public static getGeneration(entity: Entity): number {
    return (entity >>> INDEX_BITS) & MAX_GENERATION;
  }

  public get count(): number {
    return this.aliveCount;
  }
}
