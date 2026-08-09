import { World } from "../ecs";
import { Position, Velocity, Weapon, Projectile, Lifetime, Sprite, Collider, PlayerTag } from "../components";

export function ShootingSystem(
  world: World,
  _dt: number,
  inputState: { mouseX: number; mouseY: number; isShooting: boolean }
): void {
  world.query(Position, Weapon, PlayerTag).each((playerEntity, pos, weapon) => {
    if (weapon.cooldown > 0) {
      weapon.cooldown--;
    }

    if (inputState.isShooting && weapon.cooldown === 0) {
      weapon.cooldown = weapon.fireRate;

      const dx = inputState.mouseX - pos.x;
      const dy = inputState.mouseY - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        const vx = (dx / dist) * weapon.bulletSpeed;
        const vy = (dy / dist) * weapon.bulletSpeed;

        // Spawn Bullet entity
        const bullet = world.spawn();
        world.addComponent(bullet, new Position(pos.x, pos.y));
        world.addComponent(bullet, new Velocity(vx, vy));
        world.addComponent(bullet, new Projectile(weapon.damage, playerEntity));
        world.addComponent(bullet, new Collider(4, false));
        world.addComponent(bullet, new Lifetime(120, 120));
        world.addComponent(bullet, new Sprite("#f59e0b", 6, "circle"));
      }
    }
  });

  // Handle lifetime expiration for projectiles & particles
  world.query(Lifetime).each((entity, lifetime) => {
    lifetime.remaining--;
    if (lifetime.remaining <= 0) {
      world.despawn(entity);
    }
  });
}
