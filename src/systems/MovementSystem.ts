import { World } from "../ecs";
import { Position, Velocity, Collider, Projectile } from "../components";
import { CaveGenerator } from "../world/CaveGenerator";

export function MovementSystem(world: World, _dt: number, cave: CaveGenerator): void {
  world.query(Position, Velocity).each((entity, pos, vel) => {
    const collider = world.getComponent(entity, Collider);
    const radius = collider ? collider.radius : 0;
    const isBullet = world.hasComponent(entity, Projectile);

    if (isBullet) {
      pos.x += vel.vx;
      pos.y += vel.vy;
      return;
    }

    // Try moving X axis first
    if (vel.vx !== 0) {
      const nextX = pos.x + vel.vx;
      const checkX = nextX + Math.sign(vel.vx) * radius;
      if (cave.isWall(checkX, pos.y - radius * 0.5) || cave.isWall(checkX, pos.y + radius * 0.5)) {
        vel.vx = 0;
      } else {
        pos.x = nextX;
      }
    }

    // Try moving Y axis second (enables wall sliding)
    if (vel.vy !== 0) {
      const nextY = pos.y + vel.vy;
      const checkY = nextY + Math.sign(vel.vy) * radius;
      if (cave.isWall(pos.x - radius * 0.5, checkY) || cave.isWall(pos.x + radius * 0.5, checkY)) {
        vel.vy = 0;
      } else {
        pos.y = nextY;
      }
    }
  });
}
