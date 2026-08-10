import { World } from "../ecs";
import { Position, Velocity, Weapon, Projectile, Lifetime, Sprite, Collider, PlayerTag, MeleeAttack, Health, EnemyTag } from "../components";

export interface ShootingInput {
  mouseX: number;
  mouseY: number;
  isShooting: boolean;
  isMelee: boolean;
  isReloading: boolean;
}

export function ShootingSystem(world: World, _dt: number, input: ShootingInput): void {
  world.query(Position, Weapon, PlayerTag).each((playerEntity, pos, weapon) => {
    const melee = world.getComponent(playerEntity, MeleeAttack);
    const health = world.getComponent(playerEntity, Health);

    if (melee) {
      if (melee.cooldown > 0) melee.cooldown--;
      if (melee.slashAnimTimer > 0) melee.slashAnimTimer--;

      // Right Click Melee Attack Execution
      if (input.isMelee && melee.cooldown === 0) {
        const dx = input.mouseX - pos.x;
        const dy = input.mouseY - pos.y;
        const angle = Math.atan2(dy, dx);

        melee.slashAngle = angle;
        melee.slashAnimTimer = 12; // 12 frame visual slash duration
        melee.cooldown = melee.maxCooldown;

        // Perform Melee Arc Hit Detection
        world.query(Position, Health, Collider, EnemyTag).each((enemyEntity, ePos, eHp, eCollider) => {
          const edx = ePos.x - pos.x;
          const edy = ePos.y - pos.y;
          const eDist = Math.hypot(edx, edy);

          if (eDist <= melee.range + eCollider.radius) {
            const eAngle = Math.atan2(edy, edx);
            let angleDiff = Math.abs(angle - eAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (angleDiff <= Math.PI / 3) { // 120 degree cone arc
              const damageDealt = Math.min(eHp.current, melee.damage);
              eHp.current -= melee.damage;

              // Lifesteal heal
              if (health) {
                health.current = Math.min(health.max, health.current + damageDealt * weapon.lifesteal);
              }

              // Refill ammo on kill
              if (eHp.current <= 0) {
                weapon.ammo = weapon.maxAmmo;
                weapon.isReloading = false;
                weapon.reloadTimer = 0;
                world.despawn(enemyEntity);
              }
            }
          }
        });
      }
    }

    // Handle Reloading logic
    if (input.isReloading && weapon.ammo < weapon.maxAmmo && !weapon.isReloading) {
      weapon.startReload();
    }

    if (weapon.isReloading) {
      weapon.reloadTimer--;
      if (weapon.reloadTimer <= 0) {
        weapon.isReloading = false;
        weapon.ammo = weapon.maxAmmo;
      }
      return; // Cannot shoot while reloading
    }

    if (weapon.cooldown > 0) {
      weapon.cooldown--;
    }

    // Left Click Shooting Logic
    if (input.isShooting && weapon.cooldown === 0) {
      if (weapon.ammo <= 0) {
        weapon.startReload();
        return;
      }

      weapon.cooldown = weapon.fireRate;
      weapon.ammo--;

      const dx = input.mouseX - pos.x;
      const dy = input.mouseY - pos.y;
      const len = Math.hypot(dx, dy);

      if (len > 0) {
        const vx = (dx / len) * weapon.bulletSpeed;
        const vy = (dy / len) * weapon.bulletSpeed;

        const bullet = world.spawn();
        world.addComponent(bullet, new Position(pos.x, pos.y));
        world.addComponent(bullet, new Velocity(vx, vy));
        world.addComponent(bullet, new Projectile(weapon.damage, playerEntity));
        world.addComponent(bullet, new Collider(4, false));
        world.addComponent(bullet, new Lifetime(180, 180));
        world.addComponent(bullet, new Sprite("#38bdf8", 8, "circle"));
      }

      if (weapon.ammo === 0) {
        weapon.startReload();
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
