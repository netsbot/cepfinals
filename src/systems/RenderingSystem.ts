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
  p.background(11, 13, 18);

  // 1. Draw Cave Base Map
  p.noStroke();
  for (let x = 0; x < cave.cols; x++) {
    for (let y = 0; y < cave.rows; y++) {
      if (cave.grid[x]![y] === 1) {
        p.fill(24, 30, 42); // Wall color
        p.rect(x * cave.tileSize, y * cave.tileSize, cave.tileSize, cave.tileSize);
      } else {
        p.fill(16, 20, 29); // Floor color
        p.rect(x * cave.tileSize, y * cave.tileSize, cave.tileSize, cave.tileSize);
      }
    }
  }

  // 2. Query Fog of War component
  let fog: FogOfWarComponent | null = null;
  world.query(FogOfWarComponent, FogTag).each((_e, f) => {
    fog = f;
  });

  // 3. Draw Bullets / Projectiles (if inside visible tile)
  world.query(Position, Projectile, Sprite).each((_e, pos, _proj, sprite) => {
    if (fog) {
      const tx = Math.floor(pos.x / cave.tileSize);
      const ty = Math.floor(pos.y / cave.tileSize);
      if (fog.get(tx, ty) !== 2) return; // Hide bullet in fog
    }

    p.fill(sprite.color);
    p.noStroke();
    p.circle(pos.x, pos.y, sprite.size);
  });

  // 4. Draw Enemies ONLY if Visibility === "visible"
  world.query(Position, Health, Sprite, DNA, Visibility, EnemyTag).each((_e, pos, health, sprite, dna, vis) => {
    if (vis.state !== "visible") return; // Hidden in fog of war!

    p.push();
    p.translate(pos.x, pos.y);

    // Color derived from Aggression (Red) & Speed (Green)
    const r = p.map(dna.aggression, 0.1, 1.0, 120, 255);
    const g = p.map(dna.speed, 1.0, 4.5, 80, 220);
    p.fill(r, g, 80);
    p.stroke(255, 100);
    p.strokeWeight(1);
    p.circle(0, 0, sprite.size);

    // Health bar above enemy
    if (health.current < health.max) {
      p.noStroke();
      p.fill(40);
      p.rect(-10, -sprite.size / 2 - 6, 20, 4);
      p.fill(239, 68, 68);
      const hpWidth = p.map(health.current, 0, health.max, 0, 20);
      p.rect(-10, -sprite.size / 2 - 6, Math.max(0, hpWidth), 4);
    }
    p.pop();
  });

  // 5. Draw Fog of War Shading Overlay
  if (fog) {
    const fComp = fog as FogOfWarComponent;
    p.noStroke();
    for (let x = 0; x < cave.cols; x++) {
      for (let y = 0; y < cave.rows; y++) {
        const state = fComp.get(x, y);
        if (state === 0) {
          // Unexplored: Pitch Black
          p.fill(11, 13, 18, 255);
          p.rect(x * cave.tileSize, y * cave.tileSize, cave.tileSize, cave.tileSize);
        } else if (state === 1) {
          // Explored: Memory Fog
          p.fill(11, 13, 18, 170);
          p.rect(x * cave.tileSize, y * cave.tileSize, cave.tileSize, cave.tileSize);
        }
      }
    }
  }

  // 4. Draw Player
  world.query(Position, Health, Sprite, PlayerTag).each((_e, pos, health, sprite) => {
    p.push();
    p.translate(pos.x, pos.y);

    // Player body
    p.fill(56, 189, 248);
    p.stroke(255);
    p.strokeWeight(2);
    p.circle(0, 0, sprite.size);

    // Direction pointer towards mouse
    const angle = Math.atan2(p.mouseY - pos.y, p.mouseX - pos.x);
    p.rotate(angle);
    p.stroke(56, 189, 248);
    p.strokeWeight(3);
    p.line(0, 0, 14, 0);

    p.pop();

    // Player health bar above head
    p.push();
    p.noStroke();
    p.fill(30);
    p.rect(pos.x - 16, pos.y - sprite.size / 2 - 10, 32, 5);
    p.fill(34, 197, 94);
    const hpWidth = p.map(health.current, 0, health.max, 0, 32);
    p.rect(pos.x - 16, pos.y - sprite.size / 2 - 10, Math.max(0, hpWidth), 5);
    p.pop();
  });

  // 5. Draw HUD Overlay
  p.push();
  p.fill(255);
  p.textSize(14);
  p.textAlign(p.LEFT, p.TOP);
  p.text(`WAVE: ${stats.wave}`, 15, 12);
  p.text(`ENEMIES ALIVE: ${stats.enemiesRemaining}`, 15, 32);
  p.text(`PLAYER HP: ${stats.playerHp}/${stats.playerMaxHp}`, 15, 52);

  // Genetic Algorithm Evolution HUD Panel
  p.fill(24, 30, 42, 220);
  p.stroke(56, 189, 248, 100);
  p.rect(p.width - 240, 10, 230, 115, 6);

  p.fill(56, 189, 248);
  p.noStroke();
  p.text("DNA EVOLUTION TRAITS", p.width - 230, 18);
  p.fill(200);
  p.textSize(12);
  p.text(`Top Speed: ${stats.topSpeed.toFixed(2)}`, p.width - 230, 38);
  p.text(`Top Max HP: ${stats.topHealth.toFixed(0)}`, p.width - 230, 54);
  p.text(`Top Aggression: ${(stats.topAggression * 100).toFixed(0)}%`, p.width - 230, 70);
  p.text(`Top Heal Rate: ${stats.topHealRate.toFixed(2)} HP/f`, p.width - 230, 86);
  p.pop();
}
