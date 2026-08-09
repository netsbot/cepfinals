import { Entity } from "./Entity";
import { ComponentConstructor, ComponentRegistry } from "./Component";
import { SparseSet } from "./SparseSet";

export type ComponentTuple<T extends ComponentConstructor[]> = {
  [K in keyof T]: T[K] extends ComponentConstructor<infer C> ? C : never;
};

export class Query<T extends ComponentConstructor[]> {
  private withMask = 0n;
  private withoutMask = 0n;
  private components: T;
  private getStorage: (typeId: number) => SparseSet<any> | undefined;
  private getEntityMask: (entity: Entity) => bigint;
  constructor(
    components: [...T],
    getStorage: (typeId: number) => SparseSet<any> | undefined,
    getEntityMask: (entity: Entity) => bigint
  ) {
    this.components = components;
    this.getStorage = getStorage;
    this.getEntityMask = getEntityMask;

    for (const comp of components) {
      this.withMask |= ComponentRegistry.getMask(comp);
    }
  }

  public without(...components: ComponentConstructor[]): this {
    for (const comp of components) {
      this.withoutMask |= ComponentRegistry.getMask(comp);
    }
    return this;
  }

  /**
   * Rust-style iterator yielding [Entity, Component1, Component2, ...].
   * Selects smallest dense storage for minimal iteration steps.
   */
  public *iter(): Generator<[Entity, ...ComponentTuple<T>]> {
    if (this.components.length === 0) return;

    // Find component with smallest dense array to minimize iteration loop
    let smallestSize = Infinity;
    let primaryStorage: SparseSet<any> | undefined;

    for (const comp of this.components) {
      const typeId = ComponentRegistry.getId(comp);
      const storage = this.getStorage(typeId);
      if (!storage || storage.size === 0) return; // Empty query
      if (storage.size < smallestSize) {
        smallestSize = storage.size;
        primaryStorage = storage;
      }
    }

    if (!primaryStorage) return;

    // Iterating over smallest dense storage array (Cache-friendly)
    const dense = primaryStorage.denseEntities;
    const storages = this.components.map((comp) =>
      this.getStorage(ComponentRegistry.getId(comp))!
    );

    for (let i = 0; i < dense.length; i++) {
      const entity = dense[i]!;
      const mask = this.getEntityMask(entity);

      if ((mask & this.withMask) === this.withMask && (mask & this.withoutMask) === 0n) {
        const tuple = storages.map((s) => s.get(entity)) as ComponentTuple<T>;
        yield [entity, ...tuple];
      }
    }
  }

  /**
   * Fast closure execution without generator allocation overhead.
   */
  public each(fn: (entity: Entity, ...components: ComponentTuple<T>) => void): void {
    for (const item of this.iter()) {
      const [entity, ...comps] = item;
      fn(entity, ...comps);
    }
  }
}
