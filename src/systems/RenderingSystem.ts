import p5 from "p5";
import { World } from "../ecs";
import { Position, Health, Sprite, DNA, PlayerTag, EnemyTag, Projectile, FogOfWarComponent, Visibility, FogTag } from "../components";
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

  // 2. Draw Cave Base Map with Flat High-Contrast Colors (No Outlines)
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

  // 3. Draw Bullets / Projectiles (Only in visible tiles)
  world.query(Position, Projectile, Sprite).each((_e, pos, _proj, sprite) => {
    if (fComp) {
      const tx = Math.floor(pos.x / cave.tileSize);
      const ty = Math.floor(pos.y / cave.tileSize);
      if (fComp.get(tx, ty) !== 2) return; // Hide bullet in fog
    }

    p.push();
    p.noStroke();
    p.fill(250, 204, 21); // Solid Bright Yellow
    p.circle(pos.x, pos.y, sprite.size);
    p.pop();
  });

  // 4. Draw Enemies (ONLY if Visibility === "visible")
  world.query(Position, Health, Sprite, DNA, Visibility, EnemyTag).each((_e, pos, health, sprite, dna, vis) => {
    if (vis.state !== "visible") return; // Hidden in fog of war!

    p.push();
    p.translate(pos.x, pos.y);
    p.noStroke();

    // Color derived from Aggression (Red) & Speed (Yellow/Orange)
    const r = p.map(dna.aggression, 0.1, 1.0, 200, 255);
    const g = p.map(dna.speed, 1.0, 4.5, 60, 180);
    p.fill(r, g, 30);
    p.circle(0, 0, sprite.size);

    // Health bar above enemy
    if (health.current < health.max) {
      p.fill(15, 23, 42);
      p.rect(-12, -sprite.size / 2 - 8, 24, 4);
      p.fill(239, 68, 68);
      const hpWidth = p.map(health.current, 0, health.max, 0, 24);
      p.rect(-12, -sprite.size / 2 - 8, Math.max(0, hpWidth), 4);
    }
    p.pop();
  });

  // 5. Draw Player (Solid Electric Cyan)
  world.query(Position, Health, Sprite, PlayerTag).each((_e, pos, health, sprite) => {
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

  // 6. Draw HUD Overlay (High contrast text cards)
  p.push();
  p.noStroke();
  p.textSize(14);
  p.textFont("monospace");
  p.textAlign(p.LEFT, p.TOP);

  // Top Left HUD
  p.fill(15, 23, 42, 230);
  p.rect(10, 10, 220, 95, 4);

  p.fill(6, 182, 212);
  p.text(`WAVE: ${stats.wave}`, 20, 18);
  p.fill(244, 63, 94);
  p.text(`ENEMIES: ${stats.enemiesRemaining}`, 20, 38);
  p.fill(34, 197, 94);
  p.text(`HP: ${Math.ceil(stats.playerHp)}/${stats.playerMaxHp}`, 20, 58);

  // Ammo Display
  if (stats.isReloading) {
    p.fill(250, 204, 21);
    p.text("AMMO: RELOADING...", 20, 78);
  } else {
    p.fill(250, 204, 21);
    p.text(`AMMO: ${stats.playerAmmo}/${stats.playerMaxAmmo}`, 20, 78);
  }

  // Top Right Genetic Algorithm Traits HUD
  p.fill(15, 23, 42, 230);
  p.rect(p.width - 240, 10, 230, 115, 4);

  p.fill(6, 182, 212);
  p.text("DNA EVOLUTION TRAITS", p.width - 230, 18);
  p.fill(226, 232, 240);
  p.textSize(12);
  p.text(`Top Speed: ${stats.topSpeed.toFixed(2)}`, p.width - 230, 38);
  p.text(`Top Max HP: ${stats.topHealth.toFixed(0)}`, p.width - 230, 54);
  p.text(`Top Aggression: ${(stats.topAggression * 100).toFixed(0)}%`, p.width - 230, 70);
  p.text(`Top Heal Rate: ${stats.topHealRate.toFixed(2)} HP/f`, p.width - 230, 86);
  p.pop();

  // 7. Game Over Screen Overlay
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
