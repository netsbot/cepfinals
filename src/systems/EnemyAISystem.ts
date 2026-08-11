import { World, Entity } from "../ecs";
import { Position, Velocity, AI, DNA, Fitness, Health, EnemyType, Projectile, Lifetime, Sprite, Collider, PlayerTag, EnemyTag, EnemyArchetype, AIState } from "../components";

export function EnemyAISystem(world: World, _dt: number): void {
  // Find player entity
  let playerEntity: Entity | null = null;
  let playerPos: Position | null = null;

  world.query(Position, PlayerTag).each((entity, pos) => {
    playerEntity = entity;
    playerPos = pos;
  });

  world.query(Position, Health, AI, DNA, Fitness, EnemyTag).each((enemyEntity, pos, health, ai, dna, fitness) => {
    fitness.timeSurvived += 1;
    fitness.distanceTraveled += 0.5; // Approximation per frame tick

    const enemyTypeComp = world.getComponent(enemyEntity, EnemyType);
    const archetype = enemyTypeComp ? enemyTypeComp.archetype : EnemyArchetype.SLASHER;

    if (ai.cooldownTimer > 0) {
      ai.cooldownTimer--;
    }

    // Passive regeneration / Active heal when fleeing
    if (health.current < health.max) {
      const healAmount = Math.min(dna.healRate, health.max - health.current);
      health.current += healAmount;
      fitness.hpHealed += healAmount;
    }

    if (playerEntity === null || !playerPos) {
      ai.state = AIState.WANDER;
      ai.target = null;
      return;
    }

    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dist = Math.hypot(dx, dy);

    // Low HP Retreat Behavior (< 35% HP)
    const isLowHp = health.current < health.max * 0.35;
    const isHealedEnough = health.current > health.max * 0.7;

    if (ai.state === AIState.RETREAT && !isHealedEnough) {
      ai.target = playerEntity;
      return; // Maintain retreat state until recovered
    }

    if (isLowHp && dist <= dna.visionRadius) {
      ai.state = AIState.RETREAT;
      ai.target = playerEntity;
      return;
    }

    if (dist <= dna.visionRadius) {
      ai.target = playerEntity;

      if (archetype === EnemyArchetype.SHOOTER) {
        // Shooter (ADC): Strict Kiting & Max Firing Range Spacing
        if (dist > 200) {
          ai.state = AIState.CHASE;
        } else if (dist < 130) {
          ai.state = AIState.FLEE; // Back up to maintain ADC kiting distance
        } else {
          ai.state = AIState.IDLE;
        }

        // Shoot projectile at player
        if (ai.cooldownTimer === 0) {
          ai.cooldownTimer = Math.floor(dna.attackCooldown * 1.4);
          fitness.attackCount++;

          const bulletSpeed = 5.5;
          const vx = (dx / dist) * bulletSpeed;
          const vy = (dy / dist) * bulletSpeed;

          // Spawn bullet offset ahead of shooter to prevent clipping
          const spawnX = pos.x + (dx / dist) * 16;
          const spawnY = pos.y + (dy / dist) * 16;

          const bullet = world.spawn();
          world.addComponent(bullet, new Position(spawnX, spawnY));
          world.addComponent(bullet, new Velocity(vx, vy));
          world.addComponent(bullet, new Projectile(6, enemyEntity)); // 6 damage
          world.addComponent(bullet, new Collider(5, false));
          world.addComponent(bullet, new Lifetime(140, 140));
          world.addComponent(bullet, new Sprite("#f43f5e", 8, "circle"));
        }
      } else if (archetype === EnemyArchetype.TANK) {
        // Tank (Roamer / Body Blocker): Position between Player and Shooter allies to soak hits!
        ai.state = AIState.CHASE;

        // Melee punch if close
        if (dist <= 30 && ai.cooldownTimer === 0) {
          ai.state = AIState.ATTACK;
          ai.cooldownTimer = dna.attackCooldown;
          fitness.attackCount++;
        }
      } else {
        // Slasher (Top Laner): Relentless 1v1 aggressive rushdown
        if (dist <= 25 && ai.cooldownTimer === 0) {
          ai.state = AIState.ATTACK;
          ai.cooldownTimer = dna.attackCooldown;
          fitness.attackCount++;
        } else {
          ai.state = AIState.CHASE;
        }
      }
    } else {
      ai.state = AIState.WANDER;
      ai.target = null;
    }
  });
}
