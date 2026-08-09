import { World, Entity } from "../ecs";
import { Position, AI, DNA, Fitness, Health, PlayerTag, EnemyTag } from "../components";

export function EnemyAISystem(world: World, _dt: number): void {
  // Find player entity
  let playerEntity: Entity | null = null;
  let playerPos: Position | null = null;

  world.query(Position, PlayerTag).each((entity, pos) => {
    playerEntity = entity;
    playerPos = pos;
  });

  world.query(Position, Health, AI, DNA, Fitness, EnemyTag).each((_entity, pos, health, ai, dna, fitness) => {
    fitness.timeSurvived += 1;
    fitness.distanceTraveled += 0.5; // Approximation per frame tick

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
      ai.state = "wander";
      ai.target = null;
      return;
    }

    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dist = Math.hypot(dx, dy);

    // Low HP Flee Behavior (< 35% HP)
    const isLowHp = health.current < health.max * 0.35;
    const isHealedEnough = health.current > health.max * 0.7;

    if (ai.state === "flee" && !isHealedEnough) {
      ai.target = playerEntity;
      return; // Maintain flee state until recovered
    }

    if (isLowHp && dist <= dna.visionRadius) {
      ai.state = "flee";
      ai.target = playerEntity;
      return;
    }

    if (dist <= dna.visionRadius) {
      ai.target = playerEntity;

      if (dist <= 25 && ai.cooldownTimer === 0) {
        ai.state = "attack";
        ai.cooldownTimer = dna.attackCooldown;
        fitness.attackCount++;
      } else {
        ai.state = "chase";
      }
    } else {
      ai.state = "wander";
      ai.target = null;
    }
  });
}
