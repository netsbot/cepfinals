import { Entity, EntityAllocator } from "./Entity";

/**
 * Rust-style Sparse Set Component Storage.
 * Provides O(1) insert, O(1) lookup, O(1) swap-remove, and cache-friendly dense iteration.
 */
export interface IStorage {
  remove(entity: Entity): boolean;
  has(entity: Entity): boolean;
}

export class SparseSet<T> implements IStorage {
  private sparse: Int32Array;
  private dense: Entity[] = [];
  public data: T[] = [];

  constructor(maxEntities: number = 100000) {
    this.sparse = new Int32Array(maxEntities);
    this.sparse.fill(-1);
  }

  public insert(entity: Entity, component: T): void {
    const index = EntityAllocator.getIndex(entity);

    if (index >= this.sparse.length) {
      this.resizeSparse(index * 2);
    }

    const denseIndex = this.sparse[index]!;
    if (denseIndex !== -1 && this.dense[denseIndex] === entity) {
      // Overwrite existing component
      this.data[denseIndex] = component;
      return;
    }

    // Insert new
    const newDenseIndex = this.dense.length;
    this.sparse[index] = newDenseIndex;
    this.dense.push(entity);
    this.data.push(component);
  }

  public get(entity: Entity): T | undefined {
    const index = EntityAllocator.getIndex(entity);
    if (index >= this.sparse.length) return undefined;
    const denseIndex = this.sparse[index]!;
    if (denseIndex === -1 || denseIndex >= this.dense.length) return undefined;
    if (this.dense[denseIndex] !== entity) return undefined;
    return this.data[denseIndex];
  }

  public has(entity: Entity): boolean {
    const index = EntityAllocator.getIndex(entity);
    if (index >= this.sparse.length) return false;
    const denseIndex = this.sparse[index]!;
    return denseIndex !== -1 && denseIndex < this.dense.length && this.dense[denseIndex] === entity;
  }

  /**
   * Rust `Vec::swap_remove` implementation for O(1) removal.
   */
  public remove(entity: Entity): boolean {
    const index = EntityAllocator.getIndex(entity);
    if (index >= this.sparse.length) return false;

    const denseIndex = this.sparse[index]!;
    if (denseIndex === -1 || denseIndex >= this.dense.length || this.dense[denseIndex] !== entity) {
      return false;
    }

    const lastDenseIndex = this.dense.length - 1;
    const lastEntity = this.dense[lastDenseIndex]!;
    const lastComponent = this.data[lastDenseIndex]!;

    // Swap last element into deleted slot
    this.dense[denseIndex] = lastEntity;
    this.data[denseIndex] = lastComponent;

    // Update sparse mapping of swapped element
    const lastEntityIndex = EntityAllocator.getIndex(lastEntity);
    this.sparse[lastEntityIndex] = denseIndex;

    // Clear removed slot
    this.sparse[index] = -1;
    this.dense.pop();
    this.data.pop();

    return true;
  }

  public get denseEntities(): readonly Entity[] {
    return this.dense;
  }

  public get size(): number {
    return this.dense.length;
  }

  private resizeSparse(newSize: number): void {
    const newSparse = new Int32Array(newSize);
    newSparse.fill(-1);
    newSparse.set(this.sparse);
    this.sparse = newSparse;
  }
}
