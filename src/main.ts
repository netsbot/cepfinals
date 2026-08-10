import p5 from "p5";
import { World, Entity } from "./ecs";
import {
  Position,
  Velocity,
  Health,
  Collider,
  Sprite,
  Weapon,
  DNA,
  Fitness,
  AI,
  Steering,
  PlayerTag,
  EnemyTag,
  EnemyType,
  EnemyArchetype,
  Vision,
  Visibility,
  FogOfWarComponent,
  FogTag,
} from "./components";
import { CaveGenerator } from "./world/CaveGenerator";
import { MovementSystem } from "./systems/MovementSystem";
import { SteeringSystem } from "./systems/SteeringSystem";
import { EnemyAISystem } from "./systems/EnemyAISystem";
import { ShootingSystem } from "./systems/ShootingSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { FogOfWarSystem } from "./systems/FogOfWarSystem";
import { RenderingSystem, RenderStats } from "./systems/RenderingSystem";
import { GeneticAlgorithmSystem } from "./systems/GeneticAlgorithmSystem";

class GameApp {
  public world: World;
  public cave: CaveGenerator;
  public wave: number = 1;
  public playerEntity: Entity | null = null;
  public fogEntity: Entity | null = null;
  public enemyCountPerWave: number = 12;
  public currentEnemyPool: DNA[] = [];
  public isWaveTransitioning: boolean = false;
  public isGameOver: boolean = false;
  public isStartScreen: boolean = true;
  public isHelpOpen: boolean = false;

  constructor() {
    this.world = new World();
    this.cave = new CaveGenerator(60, 40, 20); // 1200x800 resolution
  }

  public initGame(): void {
    // Reset World State
    this.isGameOver = false;

    // 1. Generate Cave Map
    this.cave.generate(0.45, 5);

    // 2. Spawn Fog of War Entity
    this.fogEntity = this.world.spawn();
    this.world.addComponent(this.fogEntity, new FogOfWarComponent(60, 40));
    this.world.addComponent(this.fogEntity, new FogTag());

    // 3. Spawn Player with Vision Component
    const playerSpawn = this.cave.getFreeSpawnPoint();
    this.playerEntity = this.world.spawn();
    this.world.addComponent(this.playerEntity, new Position(playerSpawn.x, playerSpawn.y));
    this.world.addComponent(this.playerEntity, new Velocity(0, 0));
    this.world.addComponent(this.playerEntity, new Health(100, 100));
    this.world.addComponent(this.playerEntity, new Collider(12, false));
    this.world.addComponent(this.playerEntity, new Weapon());
    this.world.addComponent(this.playerEntity, new Vision(12)); // 12 tile vision radius
    this.world.addComponent(this.playerEntity, new Sprite("#38bdf8", 20, "circle"));
    this.world.addComponent(this.playerEntity, new PlayerTag());

    // 4. Initial Enemy Pool
    this.currentEnemyPool = Array.from({ length: this.enemyCountPerWave }, () => new DNA());
    this.spawnEnemyWave();
  }

  public restartGame(): void {
    // Wipe all entities from world
    const entitiesToDespawn: Entity[] = [];
    this.world.query(Position).each((entity) => {
      entitiesToDespawn.push(entity);
    });
    for (const e of entitiesToDespawn) {
      this.world.despawnImmediate(e);
    }

    this.wave = 1;
    this.enemyCountPerWave = 12;
    this.isStartScreen = false;
    this.initGame();
  }

  public spawnEnemyWave(): void {
    for (let i = 0; i < this.currentEnemyPool.length; i++) {
      const dna = this.currentEnemyPool[i]!;
      const spawn = this.cave.getFreeSpawnPoint();

      // Progressive Enemy Introduction per Wave
      let archetype: EnemyArchetype = "slasher";
      if (this.wave === 1) {
        archetype = "slasher";
      } else if (this.wave === 2) {
        archetype = "shooter";
      } else if (this.wave === 3) {
        archetype = "tank";
      } else {
        // Wave 4+: Mixed Swarm
        const rand = Math.random();
        archetype = rand < 0.5 ? "slasher" : rand < 0.85 ? "shooter" : "tank";
      }

      const maxHealth = archetype === "tank" ? dna.maxHealth * 2.5 : dna.maxHealth;
      const speed = archetype === "tank" ? dna.speed * 0.6 : archetype === "slasher" ? dna.speed * 1.2 : dna.speed;
      const radius = archetype === "tank" ? 16 : 10;

      const enemy = this.world.spawn();
      this.world.addComponent(enemy, new Position(spawn.x, spawn.y));
      this.world.addComponent(enemy, new Velocity(0, 0));
      this.world.addComponent(enemy, new Health(maxHealth, maxHealth));
      this.world.addComponent(enemy, new Collider(radius, false));
      this.world.addComponent(enemy, new DNA(dna));
      this.world.addComponent(enemy, new Fitness());
      this.world.addComponent(enemy, new AI());
      this.world.addComponent(enemy, new Steering(speed));
      this.world.addComponent(enemy, new EnemyType(archetype));
      this.world.addComponent(enemy, new Visibility()); // Fog of War visibility
      this.world.addComponent(enemy, new Sprite("#ef4444", radius * 1.6, "circle"));
      this.world.addComponent(enemy, new EnemyTag());
    }
  }

  public handleWaveEnd(): void {
    // Collect enemy performance data for Genetic Algorithm evolution
    const parentData: { dna: DNA; score: number }[] = [];

    this.world.query(DNA, Fitness, EnemyTag).each((_e, dna, fitness) => {
      parentData.push({
        dna,
        score: fitness.computeScore(),
      });
    });

    // Increase difficulty
    this.wave++;
    this.enemyCountPerWave += 2;

    // Evolve next generation
    this.currentEnemyPool = GeneticAlgorithmSystem.evolvePopulation(
      parentData,
      this.enemyCountPerWave
    );

    // Regenerate new cave cavern layout
    this.cave.generate(0.45, 5);

    // Reset Fog of War Grid for new cavern layout
    if (this.fogEntity !== null) {
      this.world.addComponent(this.fogEntity, new FogOfWarComponent(60, 40));
    }

    // Relocate player
    if (this.playerEntity !== null && this.world.isAlive(this.playerEntity)) {
      const newSpawn = this.cave.getFreeSpawnPoint();
      const pos = this.world.getComponent(this.playerEntity, Position);
      if (pos) {
        pos.x = newSpawn.x;
        pos.y = newSpawn.y;
      }
    }

    // Spawn evolved enemies
    this.spawnEnemyWave();
  }
}

const game = new GameApp();
game.initGame();

const keys = new Set<string>();
let helpKeyPressedLast = false;

window.addEventListener("keydown", (e) => {
  keys.add(e.code);

  if (e.code === "KeyH" && !helpKeyPressedLast) {
    game.isHelpOpen = !game.isHelpOpen;
    helpKeyPressedLast = true;
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "KeyH") {
    helpKeyPressedLast = false;
  }
});

window.addEventListener("blur", () => {
  keys.clear();
});

// Setup p5 sketch
new p5((p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(1200, 800);
    canvas.parent("canvas-container");
    p.frameRate(60);

    // External DOM Help Button listener
    const helpBtn = document.getElementById("btn-help");
    if (helpBtn) {
      helpBtn.addEventListener("click", () => {
        game.isHelpOpen = !game.isHelpOpen;
      });
    }
  };

  p.mousePressed = () => {
    if (game.isStartScreen) {
      game.isStartScreen = false;
      return;
    }
    if (game.isHelpOpen) {
      game.isHelpOpen = false;
      return;
    }
  };

  p.draw = () => {
    const dt = 1 / 60;

    // Start Screen Input Listener
    if (game.isStartScreen) {
      if (keys.has("Space") || keys.has("KeyR")) {
        game.isStartScreen = false;
      }
    }

    // Game Over Restart Listener
    if (game.isGameOver) {
      if (keys.has("KeyR") || keys.has("Space")) {
        game.restartGame();
      }
    }

    // Handle Player WASD Movement Input directly on Velocity component
    const canPlay = !game.isStartScreen && !game.isHelpOpen && !game.isGameOver;

    if (canPlay && game.playerEntity !== null && game.world.isAlive(game.playerEntity)) {
      const vel = game.world.getComponent(game.playerEntity, Velocity);
      if (vel) {
        const moveSpeed = 3.5;
        let vx = 0;
        let vy = 0;

        if (keys.has("KeyW") || keys.has("ArrowUp")) vy -= moveSpeed;
        if (keys.has("KeyS") || keys.has("ArrowDown")) vy += moveSpeed;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) vx -= moveSpeed;
        if (keys.has("KeyD") || keys.has("ArrowRight")) vx += moveSpeed;

        if (vx !== 0 && vy !== 0) {
          vx *= 0.7071;
          vy *= 0.7071;
        }

        vel.vx = vx;
        vel.vy = vy;
      }
    }

    // Run ECS Systems pipeline
    if (canPlay) {
      MovementSystem(game.world, dt, game.cave);
      SteeringSystem(game.world, dt, game.cave);
      EnemyAISystem(game.world, dt);
      ShootingSystem(game.world, dt, {
        mouseX: p.mouseX,
        mouseY: p.mouseY,
        isShooting: Boolean(p.mouseIsPressed || keys.has("Space")),
        isReloading: keys.has("KeyR"),
      });
      CollisionSystem(game.world, dt, game.cave);
      FogOfWarSystem(game.world, dt, game.cave);
    }

    // Maintain deferred despawns at system boundary
    game.world.maintain();

    // Check enemy count for wave progression
    let aliveEnemies = 0;
    let topSpeed = 0;
    let topHealth = 0;
    let topAggression = 0;
    let topHealRate = 0;

    game.world.query(DNA, EnemyTag).each((_e, dna) => {
      aliveEnemies++;
      if (dna.speed > topSpeed) topSpeed = dna.speed;
      if (dna.maxHealth > topHealth) topHealth = dna.maxHealth;
      if (dna.aggression > topAggression) topAggression = dna.aggression;
      if (dna.healRate > topHealRate) topHealRate = dna.healRate;
    });

    if (aliveEnemies === 0 && !game.isWaveTransitioning && canPlay) {
      game.handleWaveEnd();
    }

    // Get player stats & check player death
    let playerHp = 0;
    let playerMaxHp = 100;
    let playerAmmo = 5;
    let playerMaxAmmo = 5;
    let isReloading = false;

    if (game.playerEntity !== null && game.world.isAlive(game.playerEntity)) {
      const hp = game.world.getComponent(game.playerEntity, Health);
      const wpn = game.world.getComponent(game.playerEntity, Weapon);
      if (hp) {
        playerHp = hp.current;
        playerMaxHp = hp.max;

        if (hp.current <= 0) {
          // Player dies!
          game.world.despawn(game.playerEntity);
          game.playerEntity = null;
          game.isGameOver = true;
        }
      }
      if (wpn) {
        playerAmmo = wpn.ammo;
        playerMaxAmmo = wpn.maxAmmo;
        isReloading = wpn.isReloading;
      }
    }

    const stats: RenderStats = {
      wave: game.wave,
      enemiesRemaining: aliveEnemies,
      playerHp,
      playerMaxHp,
      playerAmmo,
      playerMaxAmmo,
      isReloading,
      isGameOver: game.isGameOver,
      isStartScreen: game.isStartScreen,
      isHelpOpen: game.isHelpOpen,
      topSpeed,
      topHealth,
      topAggression,
      topHealRate,
    };

    // Update External DOM HUD Sidebar
    updateDomHud(stats);

    // Render Canvas
    RenderingSystem(game.world, p, game.cave, stats);
  };
});

function updateDomHud(stats: RenderStats): void {
  const hpEl = document.getElementById("hud-hp");
  const hpBarEl = document.getElementById("hud-hp-bar");
  const ammoEl = document.getElementById("hud-ammo");
  const waveEl = document.getElementById("hud-wave");
  const waveTypeEl = document.getElementById("hud-wave-type");
  const enemiesEl = document.getElementById("hud-enemies");
  const speedEl = document.getElementById("hud-top-speed");
  const topHpEl = document.getElementById("hud-top-hp");
  const aggEl = document.getElementById("hud-top-aggression");
  const healEl = document.getElementById("hud-top-heal");

  if (hpEl) hpEl.textContent = `${Math.ceil(stats.playerHp)}/${stats.playerMaxHp}`;
  if (hpBarEl) {
    const pct = Math.max(0, Math.min(100, (stats.playerHp / stats.playerMaxHp) * 100));
    hpBarEl.style.width = `${pct}%`;
  }
  if (ammoEl) {
    ammoEl.textContent = stats.isReloading ? "RELOADING..." : `${stats.playerAmmo}/${stats.playerMaxAmmo}`;
  }
  if (waveEl) waveEl.textContent = `${stats.wave}`;
  if (waveTypeEl) {
    if (stats.wave === 1) waveTypeEl.textContent = "SLASHERS";
    else if (stats.wave === 2) waveTypeEl.textContent = "SHOOTERS";
    else if (stats.wave === 3) waveTypeEl.textContent = "TANKS";
    else waveTypeEl.textContent = "MIXED SWARM";
  }
  if (enemiesEl) enemiesEl.textContent = `${stats.enemiesRemaining}`;
  if (speedEl) speedEl.textContent = stats.topSpeed.toFixed(2);
  if (topHpEl) topHpEl.textContent = stats.topHealth.toFixed(0);
  if (aggEl) aggEl.textContent = `${(stats.topAggression * 100).toFixed(0)}%`;
  if (healEl) healEl.textContent = `${stats.topHealRate.toFixed(2)} HP/f`;
}
