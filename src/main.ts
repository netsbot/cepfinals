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
  public transitionTimer: number = 0;

  constructor() {
    this.world = new World();
    this.cave = new CaveGenerator(60, 40, 20); // 1200x800 resolution
  }

  public initGame(): void {
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

  public spawnEnemyWave(): void {
    for (let i = 0; i < this.currentEnemyPool.length; i++) {
      const dna = this.currentEnemyPool[i]!;
      const spawn = this.cave.getFreeSpawnPoint();

      const enemy = this.world.spawn();
      this.world.addComponent(enemy, new Position(spawn.x, spawn.y));
      this.world.addComponent(enemy, new Velocity(0, 0));
      this.world.addComponent(enemy, new Health(dna.maxHealth, dna.maxHealth));
      this.world.addComponent(enemy, new Collider(10, false));
      this.world.addComponent(enemy, new DNA(dna));
      this.world.addComponent(enemy, new Fitness());
      this.world.addComponent(enemy, new AI());
      this.world.addComponent(enemy, new Steering(dna.speed));
      this.world.addComponent(enemy, new Visibility()); // Fog of War visibility
      this.world.addComponent(enemy, new Sprite("#ef4444", 16, "circle"));
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

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

// Setup p5 sketch
new p5((p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(1200, 800);
    canvas.parent("app");
    p.frameRate(60);
  };

  p.draw = () => {
    const dt = 1 / 60;

    // Handle Player WASD Movement Input directly on Velocity component
    if (game.playerEntity !== null && game.world.isAlive(game.playerEntity)) {
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
    MovementSystem(game.world, dt, game.cave);
    SteeringSystem(game.world, dt, game.cave);
    EnemyAISystem(game.world, dt);
    ShootingSystem(game.world, dt, {
      mouseX: p.mouseX,
      mouseY: p.mouseY,
      isShooting: Boolean(p.mouseIsPressed || keys.has("Space")),
    });
    CollisionSystem(game.world, dt, game.cave);
    FogOfWarSystem(game.world, dt, game.cave);

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

    if (aliveEnemies === 0 && !game.isWaveTransitioning) {
      game.handleWaveEnd();
    }

    // Get player stats for HUD
    let playerHp = 0;
    let playerMaxHp = 100;
    if (game.playerEntity !== null && game.world.isAlive(game.playerEntity)) {
      const hp = game.world.getComponent(game.playerEntity, Health);
      if (hp) {
        playerHp = hp.current;
        playerMaxHp = hp.max;
      }
    }

    const stats: RenderStats = {
      wave: game.wave,
      enemiesRemaining: aliveEnemies,
      playerHp,
      playerMaxHp,
      topSpeed,
      topHealth,
      topAggression,
      topHealRate,
    };

    // Render pipeline
    RenderingSystem(game.world, p, game.cave, stats);
  };
});
