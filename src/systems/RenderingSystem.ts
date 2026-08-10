import p5 from "p5";
import { World } from "../ecs";
import { Position, Health, Sprite, DNA, PlayerTag, EnemyTag, Projectile, FogOfWarComponent, Visibility, FogTag, EnemyType, MeleeAttack } from "../components";
import { CaveGenerator } from "../world/CaveGenerator";

export interface RenderStats {
  wave: number;
  enemiesRemaining: number;
  playerHp: number;
  playerMaxHp: number;
  playerAmmo: number;
  playerMaxAmmo: number;
  isReloading: boolean;
  isGameOver: boolean;
  isStartScreen: boolean;
  isHelpOpen: boolean;
  topSpeed: number;
  topHealth: number;
  topAggression: number;
  topHealRate: number;
}

export function RenderingSystem(
  world: World,
  p: p5,
  cave: CaveGenerator,
  stats: RenderStats
): void {
  p.background(0, 0, 0); // Pure black void
  p.noStroke(); // No stroke outlines on tile edges!

  // 1. Query Fog of War component
  let fog: FogOfWarComponent | null = null;
  world.query(FogOfWarComponent, FogTag).each((_e, f) => {
    fog = f;
  });

  const fComp = fog ? (fog as FogOfWarComponent) : null;

  // 2. Draw Cave Base Map with Flat High-Contrast Colors
  for (let x = 0; x < cave.cols; x++) {
    for (let y = 0; y < cave.rows; y++) {
      const isWall = cave.grid[x]![y] === 1;
      const posX = x * cave.tileSize;
      const posY = y * cave.tileSize;
      const fogState = fComp ? fComp.get(x, y) : 2; // 0: unexplored, 1: explored, 2: visible

      if (fogState === 0) {
        // UNEXPLORED: Pitch black
        p.fill(0, 0, 0);
        p.rect(posX, posY, cave.tileSize, cave.tileSize);
      } else if (fogState === 1) {
        // EXPLORED (Memory Fog): Muted dim colors
        if (isWall) {
          p.fill(46, 16, 101); // Dark muted purple wall
        } else {
          p.fill(30, 41, 59); // Dark muted slate floor
        }
        p.rect(posX, posY, cave.tileSize, cave.tileSize);

        // Dark dimming overlay over memory area
        p.fill(0, 0, 0, 150);
        p.rect(posX, posY, cave.tileSize, cave.tileSize);
      } else {
        // VISIBLE (Lit / No Fog): High contrast bright distinct colors!
        if (isWall) {
          p.fill(91, 33, 182); // Vibrant Electric Indigo Wall
        } else {
          p.fill(51, 65, 85); // Bright Slate Floor
        }
        p.rect(posX, posY, cave.tileSize, cave.tileSize);
      }
    }
  }

  // 3. Draw Bullets / Projectiles (Visually Distinct Player vs Enemy Bullets)
  world.query(Position, Projectile, Sprite).each((_e, pos, proj, sprite) => {
    if (fComp) {
      const tx = Math.floor(pos.x / cave.tileSize);
      const ty = Math.floor(pos.y / cave.tileSize);
      if (fComp.get(tx, ty) !== 2) return; // Hide bullet in fog
    }

    p.push();
    p.translate(pos.x, pos.y);
    p.noStroke();

    const isPlayerBullet = proj.owner !== null && world.hasComponent(proj.owner, PlayerTag);

    if (isPlayerBullet) {
      // Player Bullet: Electric Cyan Sphere with White Core
      p.fill(6, 182, 212, 120);
      p.circle(0, 0, sprite.size + 4); // Glow ring
      p.fill(6, 182, 212);
      p.circle(0, 0, sprite.size);
      p.fill(255, 255, 255);
      p.circle(0, 0, sprite.size * 0.4); // Core
    } else {
      // Enemy Bullet: Crimson Plasma Diamond / Star Burst
      p.fill(244, 63, 94, 140);
      p.circle(0, 0, sprite.size + 6); // Plasma aura
      p.fill(239, 68, 68);
      p.quad(0, -sprite.size, sprite.size * 0.6, 0, 0, sprite.size, -sprite.size * 0.6, 0); // Diamond shape
      p.fill(255, 200, 200);
      p.circle(0, 0, sprite.size * 0.3); // Core
    }

    p.pop();
  });

  // 4. Draw Enemies (ONLY if Visibility === "visible")
  world.query(Position, Health, Sprite, DNA, Visibility, EnemyTag).each((enemyEntity, pos, health, sprite, dna, vis) => {
    if (vis.state !== "visible") return; // Hidden in fog of war!

    const enemyTypeComp = world.getComponent(enemyEntity, EnemyType);
    const archetype = enemyTypeComp ? enemyTypeComp.archetype : "slasher";

    p.push();
    p.translate(pos.x, pos.y);
    p.noStroke();

    if (archetype === "shooter") {
      // Purple Diamond for Shooter
      p.fill(168, 85, 247);
      p.quad(0, -sprite.size, sprite.size * 0.8, 0, 0, sprite.size, -sprite.size * 0.8, 0);
    } else if (archetype === "tank") {
      // Large Orange Square for Tank
      p.fill(249, 115, 22);
      p.rectMode(p.CENTER);
      p.rect(0, 0, sprite.size * 1.3, sprite.size * 1.3, 4);
    } else {
      // Crimson Circle for Slasher
      const r = p.map(dna.aggression, 0.1, 1.0, 200, 255);
      const g = p.map(dna.speed, 1.0, 4.5, 60, 180);
      p.fill(r, g, 30);
      p.circle(0, 0, sprite.size);
    }

    // Health bar above enemy
    if (health.current < health.max) {
      p.fill(15, 23, 42);
      p.rectMode(p.CORNER);
      p.rect(-12, -sprite.size / 2 - 10, 24, 4);
      p.fill(239, 68, 68);
      const hpWidth = p.map(health.current, 0, health.max, 0, 24);
      p.rect(-12, -sprite.size / 2 - 10, Math.max(0, hpWidth), 4);
    }
    p.pop();
  });

  // 5. Draw Player (Solid Electric Cyan)
  world.query(Position, Health, Sprite, PlayerTag).each((playerEntity, pos, health, sprite) => {
    const melee = world.getComponent(playerEntity, MeleeAttack);

    p.push();
    p.translate(pos.x, pos.y);
    p.noStroke();

    // Player body
    p.fill(6, 182, 212);
    p.circle(0, 0, sprite.size);

    // Direction pointer towards mouse
    const angle = Math.atan2(p.mouseY - pos.y, p.mouseX - pos.x);
    p.rotate(angle);
    p.fill(255, 255, 255);
    p.triangle(6, -4, 16, 0, 6, 4);

    p.pop();

    // Visual Melee Slash Arc Effect
    if (melee && melee.slashAnimTimer > 0) {
      p.push();
      p.translate(pos.x, pos.y);
      p.rotate(melee.slashAngle);
      p.noFill();
      p.stroke(6, 182, 212, p.map(melee.slashAnimTimer, 0, 12, 0, 255));
      p.strokeWeight(4);
      p.arc(0, 0, melee.range * 2, melee.range * 2, -p.PI / 4.8, p.PI / 4.8);
      p.stroke(255, 255, 255, p.map(melee.slashAnimTimer, 0, 12, 0, 255));
      p.strokeWeight(2);
      p.arc(0, 0, melee.range * 1.8, melee.range * 1.8, -p.PI / 4.8, p.PI / 4.8);
      p.pop();
    }

    // Player health bar above head
    p.push();
    p.noStroke();
    p.fill(15, 23, 42);
    p.rect(pos.x - 18, pos.y - sprite.size / 2 - 12, 36, 5);
    p.fill(34, 197, 94);
    const hpWidth = p.map(health.current, 0, health.max, 0, 36);
    p.rect(pos.x - 18, pos.y - sprite.size / 2 - 12, Math.max(0, hpWidth), 5);
    p.pop();
  });

  // 6. Start Screen Overlay
  if (stats.isStartScreen) {
    p.push();
    p.fill(5, 7, 12, 245);
    p.rect(0, 0, p.width, p.height);

    p.textAlign(p.CENTER, p.CENTER);
    p.fill(6, 182, 212);
    p.textSize(52);
    p.textFont("monospace");
    p.text("HIVE COLLAPSE", p.width / 2, p.height / 2 - 120);

    p.fill(226, 232, 240);
    p.textSize(16);
    p.text("TOP-DOWN ECS ROGUELIKE SHOOTER WITH EVOLVING ALIEN DNA", p.width / 2, p.height / 2 - 60);

    // Controls Box
    p.fill(15, 23, 42, 230);
    p.rectMode(p.CENTER);
    p.rect(p.width / 2, p.height / 2 + 30, 520, 140, 8);

    p.fill(250, 204, 21);
    p.textSize(15);
    p.text("CONTROLS:", p.width / 2, p.height / 2 - 20);
    p.fill(203, 213, 225);
    p.textSize(14);
    p.text("WASD / ARROW KEYS : Move Character", p.width / 2, p.height / 2 + 5);
    p.text("LEFT MOUSE / SPACE : Shoot Weapons", p.width / 2, p.height / 2 + 25);
    p.text("KEY 'R' : Reload Weapon  |  KEY 'H' : Toggle Help Guide", p.width / 2, p.height / 2 + 45);

    p.fill(34, 197, 94);
    p.textSize(22);
    p.text("PRESS SPACE OR CLICK TO START", p.width / 2, p.height / 2 + 140);
    p.pop();
    return;
  }

  // 7. Help Screen Overlay Modal
  if (stats.isHelpOpen) {
    p.push();
    p.fill(5, 7, 12, 235);
    p.rect(0, 0, p.width, p.height);

    p.rectMode(p.CENTER);
    p.fill(15, 23, 42, 250);
    p.rect(p.width / 2, p.height / 2, 700, 500, 8);

    p.textAlign(p.CENTER, p.TOP);
    p.fill(6, 182, 212);
    p.textSize(28);
    p.textFont("monospace");
    p.text("HIVE COLLAPSE - PLAYER GUIDE", p.width / 2, p.height / 2 - 220);

    p.textAlign(p.LEFT, p.TOP);
    p.fill(226, 232, 240);
    p.textSize(14);

    const startY = p.height / 2 - 160;
    p.fill(250, 204, 21);
    p.text("ENEMY TYPES (INTRODUCED PER WAVE):", p.width / 2 - 310, startY);
    p.fill(226, 232, 240);
    p.text("• WAVE 1 - SLASHERS (Red Circle) : Fast melee rushers.", p.width / 2 - 310, startY + 24);
    p.text("• WAVE 2 - SHOOTERS (Purple Diamond) : Ranged bots firing energy bullets.", p.width / 2 - 310, startY + 44);
    p.text("• WAVE 3 - TANKS (Orange Square) : Slow heavy beasts with 2.5x Health.", p.width / 2 - 310, startY + 64);
    p.text("• WAVE 4+ - MIXED SWARM : Combined tactical waves of all types.", p.width / 2 - 310, startY + 84);

    p.fill(250, 204, 21);
    p.text("CORE MECHANICS:", p.width / 2 - 310, startY + 120);
    p.fill(226, 232, 240);
    p.text("• LIFESTEAL: Dealing damage heals player HP by 20%.", p.width / 2 - 310, startY + 144);
    p.text("• FOG OF WAR: Enemies inside unexplored caves are hidden from sight.", p.width / 2 - 310, startY + 164);
    p.text("• GENETIC ALGORITHMS: Fittest top 20% aliens evolve speed, HP, and heal rates.", p.width / 2 - 310, startY + 184);
    p.text("• CELLULAR AUTOMATA: Cavern layouts procedurally smooth each wave.", p.width / 2 - 310, startY + 204);

    p.textAlign(p.CENTER, p.CENTER);
    p.fill(34, 197, 94);
    p.textSize(18);
    p.text("PRESS 'H' OR CLICK TO CLOSE HELP", p.width / 2, p.height / 2 + 200);
    p.pop();
  }

  // 8. Game Over Screen Overlay
  if (stats.isGameOver) {
    p.push();
    p.fill(0, 0, 0, 220);
    p.rect(0, 0, p.width, p.height);

    p.textAlign(p.CENTER, p.CENTER);
    p.fill(239, 68, 68);
    p.textSize(48);
    p.textFont("monospace");
    p.text("GAME OVER", p.width / 2, p.height / 2 - 30);

    p.fill(226, 232, 240);
    p.textSize(18);
    p.text("PRESS 'R' OR 'SPACE' TO RESTART", p.width / 2, p.height / 2 + 30);
    p.pop();
  }
}
