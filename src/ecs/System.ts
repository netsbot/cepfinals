import { World } from "./World";

export type System = (world: World, dt: number, ctx?: any) => void;

export class SystemManager {
  private systems: System[] = [];

  public add(system: System): this {
    this.systems.push(system);
    return this;
  }

  public update(world: World, dt: number, ctx?: any): void {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i]!(world, dt, ctx);
    }
    // Automatically maintain world state at end of system tick
    world.maintain();
  }
}
