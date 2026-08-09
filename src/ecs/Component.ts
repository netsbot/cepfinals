export type ComponentConstructor<T = any> = new (...args: any[]) => T;

export type ComponentTypeId = number;

const registry = new Map<ComponentConstructor, ComponentTypeId>();
const masks = new Map<ComponentConstructor, bigint>();
let nextTypeId: ComponentTypeId = 0;

export class ComponentRegistry {
  public static getId<T>(component: ComponentConstructor<T>): ComponentTypeId {
    let id = registry.get(component);
    if (id === undefined) {
      id = nextTypeId++;
      if (id >= 64) {
        throw new Error("[ECS] Exceeded maximum supported component types (64 bit mask limit)");
      }
      registry.set(component, id);
      masks.set(component, 1n << BigInt(id));
    }
    return id;
  }

  public static getMask<T>(component: ComponentConstructor<T>): bigint {
    ComponentRegistry.getId(component);
    return masks.get(component)!;
  }
}
