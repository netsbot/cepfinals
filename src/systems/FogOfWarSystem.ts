import { World } from "../ecs";
import { Position, Vision, Visibility, FogOfWarComponent, FogTag, FogState } from "../components";
import { CaveGenerator, TileType } from "../world/CaveGenerator";

export function FogOfWarSystem(world: World, _dt: number, cave: CaveGenerator): void {
  // 1. Get Fog Entity
  let fogComp: FogOfWarComponent | null = null;
  world.query(FogOfWarComponent, FogTag).each((_e, fog) => {
    fogComp = fog;
  });

  if (!fogComp) return;
  const fog = fogComp as FogOfWarComponent;

  // 2. Demote current VISIBLE -> EXPLORED
  for (let i = 0; i < fog.grid.length; i++) {
    if (fog.grid[i] === FogState.VISIBLE) {
      fog.grid[i] = FogState.EXPLORED;
    }
  }

  // 3. Cast Vision Rays from entities with Position + Vision (Player)
  world.query(Position, Vision).each((_e, pos, vision) => {
    const startTileX = Math.floor(pos.x / cave.tileSize);
    const startTileY = Math.floor(pos.y / cave.tileSize);

    // Always reveal player cell
    fog.set(startTileX, startTileY, FogState.VISIBLE);

    const rayCount = 180;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (let r = 1; r <= vision.radiusTiles; r++) {
        const tx = Math.floor(startTileX + cos * r);
        const ty = Math.floor(startTileY + sin * r);

        if (tx < 0 || tx >= cave.cols || ty < 0 || ty >= cave.rows) break;

        fog.set(tx, ty, FogState.VISIBLE);

        // Ray blocked by cave wall
        if (cave.grid[tx]![ty] === TileType.WALL) break;
      }
    }
  });

  // 4. Update Visibility state of entities with Position + Visibility (Enemies)
  world.query(Position, Visibility).each((_e, pos, vis) => {
    const tileX = Math.floor(pos.x / cave.tileSize);
    const tileY = Math.floor(pos.y / cave.tileSize);
    vis.state = fog.get(tileX, tileY);
  });
}
