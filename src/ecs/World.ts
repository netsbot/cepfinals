import { Entity, EntityAllocator } from "./Entity";
import { ComponentConstructor, ComponentRegistry, ComponentTypeId } from "./Component";
import { SparseSet } from "./SparseSet";
import { Query } from "./Query";

export class World {
  private allocator: EntityAllocator;
  private storages = new Map<ComponentTypeId, SparseSet<any>>();
  private entityMasks: BigInt64Array;
  private pendingDespawns = new Set<Entity>();
  private aliveEntities = new Set<Entity>();

  constructor(maxEntities: number = 100000) {
    this.allocator = new EntityAllocator(maxEntities);
    this.entityMasks = new BigInt64Array(maxEntities);
  }

  public spawn(): Entity {
    const entity = this.allocator.allocate();
    const index = EntityAllocator.getIndex(entity);
    if (index >= this.entityMasks.length) {
      this.resizeMasks(index * 2);
    }
    (this.entityMasks[index] as any) = 0n;
    this.aliveEntities.add(entity);
    return entity;
  }

  public despawn(entity: Entity): void {
    this.pendingDespawns.add(entity);
  }

  public despawnImmediate(entity: Entity): boolean {
    if (!this.allocator.isAlive(entity)) return false;

    const index = EntityAllocator.getIndex(entity);
    const mask = this.entityMasks[index] ?? 0n;

    // Remove from all component storages
    for (const [typeId, storage] of this.storages) {
      const compMask = 1n << BigInt(typeId);
      if ((mask & compMask) !== 0n) {
        storage.remove(entity);
      }
    }

    (this.entityMasks[index] as any) = 0n;
    this.aliveEntities.delete(entity);
    this.pendingDespawns.delete(entity);
    return this.allocator.deallocate(entity);
  }

  public addComponent<T>(entity: Entity, component: T): void {
    if (!this.allocator.isAlive(entity)) return;

    const constructor = (component as any).constructor as ComponentConstructor<T>;
    const typeId = ComponentRegistry.getId(constructor);
    const mask = ComponentRegistry.getMask(constructor);

    let storage = this.storages.get(typeId);
    if (!storage) {
      storage = new SparseSet<T>();
      this.storages.set(typeId, storage);
    }

    storage.insert(entity, component);

    const index = EntityAllocator.getIndex(entity);
    const currentMask = this.entityMasks[index] ?? 0n;
    (this.entityMasks[index] as any) = currentMask | mask;
  }

  public removeComponent<T>(entity: Entity, componentClass: ComponentConstructor<T>): void {
    if (!this.allocator.isAlive(entity)) return;

    const typeId = ComponentRegistry.getId(componentClass);
    const mask = ComponentRegistry.getMask(componentClass);

    const storage = this.storages.get(typeId);
    if (storage) {
      storage.remove(entity);
    }

    const index = EntityAllocator.getIndex(entity);
    const currentMask = this.entityMasks[index] ?? 0n;
    (this.entityMasks[index] as any) = currentMask & ~mask;
  }

  public getComponent<T>(entity: Entity, componentClass: ComponentConstructor<T>): T | undefined {
    if (!this.allocator.isAlive(entity)) return undefined;

    const typeId = ComponentRegistry.getId(componentClass);
    const storage = this.storages.get(typeId);
    return storage ? storage.get(entity) : undefined;
  }

  public hasComponent<T>(entity: Entity, componentClass: ComponentConstructor<T>): boolean {
    if (!this.allocator.isAlive(entity)) return false;
    const mask = ComponentRegistry.getMask(componentClass);
    const index = EntityAllocator.getIndex(entity);
    return ((this.entityMasks[index] ?? 0n) & mask) !== 0n;
  }

  public isAlive(entity: Entity): boolean {
    return this.allocator.isAlive(entity);
  }

  public query<T extends ComponentConstructor[]>(...components: [...T]): Query<T> {
    return new Query<T>(
      components,
      (typeId) => this.storages.get(typeId),
      (entity) => this.entityMasks[EntityAllocator.getIndex(entity)] ?? 0n
    );
  }

  /**
   * Flush pending despawns at system phase boundary.
   */
  public maintain(): void {
    if (this.pendingDespawns.size === 0) return;
    for (const entity of this.pendingDespawns) {
      this.despawnImmediate(entity);
    }
  }

  public get entityCount(): number {
    return this.allocator.count;
  }

  private resizeMasks(newSize: number): void {
    const newMasks = new BigInt64Array(newSize);
    newMasks.set(this.entityMasks);
    this.entityMasks = newMasks;
  }
}
