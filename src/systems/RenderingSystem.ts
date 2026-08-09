import p5 from "p5";
import { World } from "../ecs";
import { Position, Health, Sprite, DNA, PlayerTag, EnemyTag, Projectile, FogOfWarComponent, Visibility, FogTag } from "../components";
import { CaveGenerator } from "../world/CaveGenerator";

export interface RenderStats {
  wave: number;
  enemiesRemaining: number;
  playerHp: number;
  playerMaxHp: number;
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
  p.background(5, 7, 12); // Deep space void background

  // 1. Query Fog of War component
  let fog: FogOfWarComponent | null = null;
  world.query(FogOfWarComponent, FogTag).each((_e, f) => {
    fog = f;
  });

  // 2. Draw Cave Base Map with High Contrast Styling
  for (let x = 0; x < cave.cols; x++) {
    for (let y = 0; y < cave.rows; y++) {
      const isWall = cave.grid[x]![y] === 1;
      const posX = x * cave.tileSize;
      const posY = y * cave.tileSize;

      if (isWall) {
        // High contrast Indigo Wall blocks with bright border lines
        p.fill(24, 20, 50);
        p.stroke(67, 56, 202);
        p.strokeWeight(1.5);
        p.rect(posX, posY, cave.tileSize, cave.tileSize, 2);
      } else {
        // Distinct slate floor with crisp grid
        p.fill(15, 23, 42);
        p.stroke(30, 41, 59, 120);
        p.strokeWeight(1);
        p.rect(posX, posY, cave.tileSize, cave.tileSize);
      }
    }
  }

  // 3. Draw Fog of War Shading Overlay
  if (fog) {
    const fComp = fog as FogOfWarComponent;
    p.noStroke();
    for (let x = 0; x < cave.cols; x++) {
      for (let y = 0; y < cave.rows; y++) {
        const state = fComp.get(x, y);
        const posX = x * cave.tileSize;
        const posY = y * cave.tileSize;

        if (state === 0) {
          // Unexplored: Pitch Black (Complete Darkness)
          p.fill(0, 0, 0, 255);
          p.rect(posX, posY, cave.tileSize, cave.tileSize);
        } else if (state === 1) {
          // Explored: Memory Fog (Cool Muted Tint with 80% opacity)
          p.fill(5, 7, 12, 205);
          p.rect(posX, posY, cave.tileSize, cave.tileSize);
        }
      }
    }
  }

  // 4. Draw Bullets / Projectiles (High-luminance glowing yellow)
  world.query(Position, Projectile, Sprite).each((_e, pos, _proj, sprite) => {
    if (fog) {
      const tx = Math.floor(pos.x / cave.tileSize);
      const ty = Math.floor(pos.y / cave.tileSize);
      if (fog.get(tx, ty) !== 2) return; // Hide bullet in fog
    }

    p.push();
    p.fill(255, 240, 102); // Electric yellow
    p.stroke(255, 255, 255);
    p.strokeWeight(1.5);
    p.circle(pos.x, pos.y, sprite.size);
    p.pop();
  });

  // 5. Draw Enemies ONLY if Visibility === "visible"
  world.query(Position, Health, Sprite, DNA, Visibility, EnemyTag).each((_e, pos, health, sprite, dna, vis) => {
    if (vis.state !== "visible") return; // Hidden in fog of war!

    p.push();
    p.translate(pos.x, pos.y);

    // Color derived from Aggression (Red) & Speed (Green/Yellow)
    const r = p.map(dna.aggression, 0.1, 1.0, 180, 255);
    const g = p.map(dna.speed, 1.0, 4.5, 40, 200);
    p.fill(r, g, 40);
    p.stroke(255, 80, 80);
    p.strokeWeight(2);
    p.circle(0, 0, sprite.size);

    // Health bar above enemy
    if (health.current < health.max) {
      p.noStroke();
      p.fill(15, 23, 42);
      p.rect(-12, -sprite.size / 2 - 8, 24, 5, 2);
      p.fill(239, 68, 68);
      const hpWidth = p.map(health.current, 0, health.max, 0, 24);
      p.rect(-12, -sprite.size / 2 - 8, Math.max(0, hpWidth), 5, 2);
    }
    p.pop();
  });

  // 6. Draw Player (Electric Neon Cyan)
  world.query(Position, Health, Sprite, PlayerTag).each((_e, pos, health, sprite) => {
    p.push();
    p.translate(pos.x, pos.y);

    // Outer glow pulse ring
    p.noFill();
    p.stroke(0, 240, 255, 120);
    p.strokeWeight(2);
    p.circle(0, 0, sprite.size + 8);

    // Player body
    p.fill(0, 240, 255);
    p.stroke(255, 255, 255);
    p.strokeWeight(2);
    p.circle(0, 0, sprite.size);

    // Direction pointer towards mouse
    const angle = Math.atan2(p.mouseY - pos.y, p.mouseX - pos.x);
    p.rotate(angle);
    p.stroke(255);
    p.strokeWeight(3);
    p.line(0, 0, 16, 0);

    p.pop();

    // Player health bar above head
    p.push();
    p.noStroke();
    p.fill(15, 23, 42);
    p.rect(pos.x - 18, pos.y - sprite.size / 2 - 12, 36, 6, 2);
    p.fill(34, 197, 94);
    const hpWidth = p.map(health.current, 0, health.max, 0, 36);
    p.rect(pos.x - 18, pos.y - sprite.size / 2 - 12, Math.max(0, hpWidth), 6, 2);
    p.pop();
  });

  // 7. Draw HUD Overlay (High-contrast glassmorphism panel)
  p.push();
  p.fill(255);
  p.textSize(14);
  p.textFont("monospace");
  p.textAlign(p.LEFT, p.TOP);

  // Top Left HUD
  p.fill(15, 23, 42, 230);
  p.stroke(56, 189, 248, 120);
  p.strokeWeight(1);
  p.rect(10, 10, 200, 75, 6);

  p.noStroke();
  p.fill(56, 189, 248);
  p.text(`WAVE: ${stats.wave}`, 20, 18);
  p.fill(244, 63, 94);
  p.text(`ENEMIES: ${stats.enemiesRemaining}`, 20, 38);
  p.fill(34, 197, 94);
  p.text(`HP: ${stats.playerHp}/${stats.playerMaxHp}`, 20, 58);

  // Top Right Genetic Algorithm Traits HUD
  p.fill(15, 23, 42, 230);
  p.stroke(56, 189, 248, 120);
  p.strokeWeight(1);
  p.rect(p.width - 240, 10, 230, 115, 6);

  p.fill(56, 189, 248);
  p.noStroke();
  p.text("DNA EVOLUTION TRAITS", p.width - 230, 18);
  p.fill(226, 232, 240);
  p.textSize(12);
  p.text(`Top Speed: ${stats.topSpeed.toFixed(2)}`, p.width - 230, 38);
  p.text(`Top Max HP: ${stats.topHealth.toFixed(0)}`, p.width - 230, 54);
  p.text(`Top Aggression: ${(stats.topAggression * 100).toFixed(0)}%`, p.width - 230, 70);
  p.text(`Top Heal Rate: ${stats.topHealRate.toFixed(2)} HP/f`, p.width - 230, 86);
  p.pop();
}
