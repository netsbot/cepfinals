import { World, Entity } from "../ecs";
import { Position, Health, Collider, Projectile, EnemyTag, PlayerTag, Fitness, AI, AIState, DNA, Weapon } from "../components";
import { CaveGenerator } from "../world/CaveGenerator";

export function CollisionSystem(world: World, _dt: number, cave: CaveGenerator): void {
  // Query Player entity components
  let playerPos: Position | null = null;
  let playerHealth: Health | null = null;
  let playerWeapon: Weapon | null = null;
  let playerCollider: Collider | null = null;

  world.query(Position, Health, Collider, Weapon, PlayerTag).each((_e, pos, health, collider, weapon) => {
    playerPos = pos;
    playerHealth = health;
    playerCollider = collider;
    playerWeapon = weapon;
  });

  // 1. Bullet Wall Despawn
  world.query(Position, Projectile).each((entity, pos) => {
    if (cave.isWall(pos.x, pos.y)) {
      world.despawn(entity);
    }
  });

  // 2. Bullet vs Enemy Collisions
  const enemies: { entity: Entity; pos: Position; health: Health; collider: Collider; fitness: Fitness; dna: DNA }[] = [];
  world.query(Position, Health, Collider, Fitness, DNA, EnemyTag).each((entity, pos, health, collider, fitness, dna) => {
    enemies.push({ entity, pos, health, collider, fitness, dna });
  });

  world.query(Position, Projectile, Collider).each((bulletEntity, bPos, proj, bCollider) => {
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]!;
      if (enemy.health.current <= 0) continue;
      if (proj.owner === enemy.entity) continue; // Ignore self-collision!
      if (proj.owner !== null && world.hasComponent(proj.owner, EnemyTag)) continue; // Ignore friendly fire!

      const dx = enemy.pos.x - bPos.x;
      const dy = enemy.pos.y - bPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < enemy.collider.radius + bCollider.radius) {
        // Check dodge chance
        if (Math.random() < enemy.dna.dodgeChance) {
          // Dodge successful!
          world.despawn(bulletEntity);
          break;
        }

        // Apply damage & calculate Lifesteal
        const damageDealt = Math.min(enemy.health.current, proj.damage);
        enemy.health.current -= proj.damage;

        if (playerHealth && playerWeapon) {
          const lifestealHeal = damageDealt * (playerWeapon as Weapon).lifesteal;
          playerHealth.current = Math.min(playerHealth.max, playerHealth.current + lifestealHeal);
        }

        world.despawn(bulletEntity);

        if (enemy.health.current <= 0) {
          // Refill player ammo on kill!
          if (playerWeapon) {
            (playerWeapon as Weapon).ammo = (playerWeapon as Weapon).maxAmmo;
            (playerWeapon as Weapon).isReloading = false;
            (playerWeapon as Weapon).reloadTimer = 0;
          }

          world.despawn(enemy.entity);
        }
        break;
      }
    }
  });

  // 3. Bullet vs Player Collisions (Enemy Bullets)
  if (playerPos && playerHealth && playerCollider) {
    world.query(Position, Projectile, Collider).each((bulletEntity, bPos, proj, bCollider) => {
      // Ignore player's own bullets
      if (proj.owner !== null && world.hasComponent(proj.owner, PlayerTag)) return;

      const dx = playerPos!.x - bPos.x;
      const dy = playerPos!.y - bPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < playerCollider!.radius + bCollider.radius) {
        // Player Dodge Check
        if (playerWeapon && Math.random() < playerWeapon.dodgeChance) {
          world.despawn(bulletEntity);
          return; // DODGED! Negate damage
        }

        playerHealth!.current = Math.max(0, playerHealth!.current - proj.damage);
        world.despawn(bulletEntity);

        // Credit damage to enemy fitness if owner alive
        if (proj.owner !== null && world.isAlive(proj.owner)) {
          const enemyFitness = world.getComponent(proj.owner, Fitness);
          if (enemyFitness) enemyFitness.damageDealt += proj.damage;
        }
      }
    });
  }

  // 3. Enemy Attacks vs Player
  if (playerPos && playerHealth && playerCollider) {
    world.query(Position, Collider, AI, Fitness, EnemyTag).each((_enemyEntity, pos, collider, ai, fitness) => {
      if (ai.state === AIState.ATTACK) {
        const dx = playerPos!.x - pos.x;
        const dy = playerPos!.y - pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= collider.radius + playerCollider!.radius + 5) {
          // Player Dodge Check for Melee Attacks
          if (playerWeapon && Math.random() < playerWeapon.dodgeChance) {
            ai.state = AIState.CHASE;
            return; // DODGED! Negate melee damage
          }

          const damage = 10;
          playerHealth!.current = Math.max(0, playerHealth!.current - damage);
          fitness.damageDealt += damage;
          ai.state = AIState.CHASE;
        }
      }
    });
  }
}
