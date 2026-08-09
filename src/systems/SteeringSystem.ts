import { World } from "../ecs";
import { Position, Velocity, Steering, AI, EnemyTag } from "../components";
import { CaveGenerator } from "../world/CaveGenerator";

export function SteeringSystem(world: World, _dt: number, cave: CaveGenerator): void {
  // Collect all enemy positions for separation check
  const enemyPositions: Position[] = [];
  world.query(Position, EnemyTag).each((_e, pos) => enemyPositions.push(pos));

  world.query(Position, Velocity, Steering, AI).each((_entity, pos, vel, steering, ai) => {
    let forceX = 0;
    let forceY = 0;

    // 1. Seek / Pursue or Flee target
    if (ai.target !== null && (ai.state === "chase" || ai.state === "flee")) {
      const targetPos = world.getComponent(ai.target, Position);
      if (targetPos) {
        let dx = targetPos.x - pos.x;
        let dy = targetPos.y - pos.y;

        if (ai.state === "flee") {
          // Invert vector to run away from player
          dx = -dx;
          dy = -dy;
        }

        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          const desiredVx = (dx / dist) * steering.maxSpeed;
          const desiredVy = (dy / dist) * steering.maxSpeed;

          forceX += (desiredVx - vel.vx) * steering.seekWeight;
          forceY += (desiredVy - vel.vy) * steering.seekWeight;
        }
      }
    } else if (ai.state === "investigate" && ai.lastKnownPos !== null) {
      // Navigate to last known player location
      const dx = ai.lastKnownPos.x - pos.x;
      const dy = ai.lastKnownPos.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        const desiredVx = (dx / dist) * steering.maxSpeed;
        const desiredVy = (dy / dist) * steering.maxSpeed;

        forceX += (desiredVx - vel.vx) * steering.seekWeight;
        forceY += (desiredVy - vel.vy) * steering.seekWeight;
      }
    }

    // 2. Wander behaviour
    if (ai.state === "wander" || ai.state === "idle") {
      steering.wanderAngle += (Math.random() - 0.5) * 0.5;
      const wanderRadius = 20;
      const wanderDist = 40;

      const circleCenterX = pos.x + (vel.vx !== 0 || vel.vy !== 0 ? (vel.vx / Math.hypot(vel.vx, vel.vy)) * wanderDist : wanderDist);
      const circleCenterY = pos.y + (vel.vx !== 0 || vel.vy !== 0 ? (vel.vy / Math.hypot(vel.vx, vel.vy)) * wanderDist : 0);

      const targetX = circleCenterX + Math.cos(steering.wanderAngle) * wanderRadius;
      const targetY = circleCenterY + Math.sin(steering.wanderAngle) * wanderRadius;

      const dx = targetX - pos.x;
      const dy = targetY - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        forceX += ((dx / dist) * steering.maxSpeed - vel.vx) * steering.wanderWeight;
        forceY += ((dy / dist) * steering.maxSpeed - vel.vy) * steering.wanderWeight;
      }
    }

    // 3. Separation (Avoid overlapping other enemies)
    let sepX = 0;
    let sepY = 0;
    let count = 0;
    const separationRadius = 24;

    for (let i = 0; i < enemyPositions.length; i++) {
      const otherPos = enemyPositions[i]!;
      if (otherPos === pos) continue;
      const dx = pos.x - otherPos.x;
      const dy = pos.y - otherPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < separationRadius) {
        sepX += dx / (dist * dist); // Weight inversely proportional to distance
        sepY += dy / (dist * dist);
        count++;
      }
    }

    if (count > 0) {
      sepX /= count;
      sepY /= count;
      const sepDist = Math.hypot(sepX, sepY);
      if (sepDist > 0) {
        forceX += ((sepX / sepDist) * steering.maxSpeed - vel.vx) * steering.separationWeight;
        forceY += ((sepY / sepDist) * steering.maxSpeed - vel.vy) * steering.separationWeight;
      }
    }

    // 4. Obstacle Avoidance (Avoid cave walls)
    const lookAheadDist = 20;
    const aheadX = pos.x + (vel.vx !== 0 ? (vel.vx / Math.hypot(vel.vx, vel.vy)) * lookAheadDist : 0);
    const aheadY = pos.y + (vel.vy !== 0 ? (vel.vy / Math.hypot(vel.vx, vel.vy)) * lookAheadDist : 0);

    if (cave.isWall(aheadX, aheadY)) {
      // Push back towards open area
      forceX -= (aheadX - pos.x) * steering.avoidanceWeight;
      forceY -= (aheadY - pos.y) * steering.avoidanceWeight;
    }

    // Limit steering force
    const totalForce = Math.hypot(forceX, forceY);
    if (totalForce > steering.maxForce) {
      forceX = (forceX / totalForce) * steering.maxForce;
      forceY = (forceY / totalForce) * steering.maxForce;
    }

    // Apply force to velocity
    vel.vx += forceX;
    vel.vy += forceY;

    // Cap velocity to maxSpeed
    const speed = Math.hypot(vel.vx, vel.vy);
    if (speed > steering.maxSpeed) {
      vel.vx = (vel.vx / speed) * steering.maxSpeed;
      vel.vy = (vel.vy / speed) * steering.maxSpeed;
    }
  });
}
