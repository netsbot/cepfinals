import { World, Entity } from "../ecs";
import { Position, AI, DNA, Fitness, Health, PlayerTag, EnemyTag } from "../components";
import { CaveGenerator } from "../world/CaveGenerator";

export function EnemyAISystem(world: World, _dt: number, cave: CaveGenerator): void {
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

    // Check Line of Sight (Imperfect Information check)
    const hasLOS = dist <= dna.visionRadius && cave.hasLineOfSight(pos.x, pos.y, playerPos.x, playerPos.y);

    if (hasLOS) {
      // Enemy sees player directly: update memory of last known position
      ai.lastKnownPos = new Position(playerPos.x, playerPos.y);
      ai.target = playerEntity;

      const isLowHp = health.current < health.max * 0.35;
      if (isLowHp) {
        ai.state = "flee";
      } else if (dist <= 25 && ai.cooldownTimer === 0) {
        ai.state = "attack";
        ai.cooldownTimer = dna.attackCooldown;
        fitness.attackCount++;
      } else {
        ai.state = "chase";
      }
    } else {
      // Direct LOS lost or out of vision range
      if (ai.state === "flee" && health.current < health.max * 0.7) {
        // Keep fleeing if still recovering
        ai.target = playerEntity;
      } else if (ai.lastKnownPos !== null) {
        // Investigate last known position
        const distToMemory = Math.hypot(ai.lastKnownPos.x - pos.x, ai.lastKnownPos.y - pos.y);
        if (distToMemory < 20) {
          // Reached last known position, player nowhere to be seen -> lose track
          ai.lastKnownPos = null;
          ai.state = "wander";
          ai.target = null;
        } else {
          ai.state = "investigate";
          ai.target = null;
        }
      } else {
        ai.state = "wander";
        ai.target = null;
      }
    }
  });
}
