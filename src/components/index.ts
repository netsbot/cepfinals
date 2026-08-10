import { Entity } from "../ecs";

export class Position {
  constructor(public x: number = 0, public y: number = 0) {}
}

export class Velocity {
  constructor(public vx: number = 0, public vy: number = 0) {}
}

export class Health {
  constructor(public current: number = 100, public max: number = 100) {}
}

export class Collider {
  constructor(public radius: number = 12, public isStatic: boolean = false) {}
}

export interface EnemyDNA {
  speed: number;          // [1.0, 4.5]
  maxHealth: number;      // [30, 150]
  aggression: number;     // [0.1, 1.0]
  visionRadius: number;   // [80, 300]
  attackCooldown: number; // [20, 90] frames
  dodgeChance: number;    // [0.0, 0.5]
  healRate: number;       // [0.05, 0.35] HP per frame
}

export class DNA implements EnemyDNA {
  public speed: number;
  public maxHealth: number;
  public aggression: number;
  public visionRadius: number;
  public attackCooldown: number;
  public dodgeChance: number;
  public healRate: number;

  constructor(dna?: Partial<EnemyDNA>) {
    this.speed = dna?.speed ?? (1.5 + Math.random() * 2.0);
    this.maxHealth = dna?.maxHealth ?? Math.floor(40 + Math.random() * 60);
    this.aggression = dna?.aggression ?? (0.3 + Math.random() * 0.6);
    this.visionRadius = dna?.visionRadius ?? (100 + Math.random() * 150);
    this.attackCooldown = dna?.attackCooldown ?? Math.floor(30 + Math.random() * 40);
    this.dodgeChance = dna?.dodgeChance ?? Math.random() * 0.3;
    this.healRate = dna?.healRate ?? (0.05 + Math.random() * 0.2);
  }
}

export class Fitness {
  public damageDealt: number = 0;
  public timeSurvived: number = 0;
  public attackCount: number = 0;
  public distanceTraveled: number = 0;
  public hpHealed: number = 0;

  public computeScore(): number {
    return (
      this.damageDealt * 5.0 +
      this.timeSurvived * 0.1 +
      this.attackCount * 2.0 +
      this.hpHealed * 1.5 +
      this.distanceTraveled * 0.01
    );
  }
}

export type AIState = "idle" | "chase" | "attack" | "flee" | "retreat" | "wander";

export class AI {
  public state: AIState = "idle";
  public target: Entity | null = null;
  public cooldownTimer: number = 0;
}

export class Steering {
  public maxSpeed: number = 2.5;
  public maxForce: number = 0.15;
  public seekWeight: number = 1.0;
  public separationWeight: number = 1.5;
  public avoidanceWeight: number = 2.0;
  public wanderWeight: number = 0.5;
  public wanderAngle: number = Math.random() * Math.PI * 2;

  constructor(maxSpeed: number = 2.5) {
    this.maxSpeed = maxSpeed;
  }
}

export class Weapon {
  public fireRate: number = 10; // frames between shots
  public damage: number = 25;
  public cooldown: number = 0;
  public bulletSpeed: number = 8;
  public lifesteal: number = 0.20; // 20% damage converted to player HP
  public ammo: number = 5;
  public maxAmmo: number = 5;
  public reloadTime: number = 90; // 90 frames = 1.5s reload duration
  public reloadTimer: number = 0;
  public isReloading: boolean = false;

  public startReload(): void {
    if (this.isReloading || this.ammo === this.maxAmmo) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
  }
}

export class MeleeAttack {
  public damage: number = 35;
  public range: number = 35;
  public cooldown: number = 0;
  public maxCooldown: number = 60; // 60 frames (1.0s cooldown)
  public slashAnimTimer: number = 0;
  public slashAngle: number = 0;
}

export class Projectile {
  constructor(public damage: number = 25, public owner: Entity | null = null) {}
}

export class Lifetime {
  constructor(public remaining: number = 180, public max: number = 180) {}
}

export class Sprite {
  constructor(
    public color: string = "#38bdf8",
    public size: number = 16,
    public shape: "circle" | "rect" | "triangle" = "circle"
  ) {}
}

export class Vision {
  constructor(public radiusTiles: number = 10) {}
}

export type VisibilityState = "unexplored" | "explored" | "visible";

export class Visibility {
  constructor(public state: VisibilityState = "unexplored") {}
}

export class FogOfWarComponent {
  public grid: Uint8Array;

  constructor(public cols: number = 60, public rows: number = 40) {
    this.grid = new Uint8Array(cols * rows);
  }

  public get(x: number, y: number): number {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return 0;
    return this.grid[x + y * this.cols] ?? 0;
  }

  public set(x: number, y: number, value: number): void {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.grid[x + y * this.cols] = value;
    }
  }
}

export type EnemyArchetype = "slasher" | "shooter" | "tank";

export class PlayerXp {
  public level: number = 1;
  public currentXp: number = 0;
  public xpToNextLevel: number = 100;

  public addXp(amount: number): boolean {
    this.currentXp += amount;
    if (this.currentXp >= this.xpToNextLevel) {
      this.currentXp -= this.xpToNextLevel;
      this.level++;
      this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.35);
      return true; // Level up triggered!
    }
    return false;
  }
}

export type PerkType =
  | "lifesteal"
  | "max_ammo"
  | "fire_rate"
  | "damage"
  | "speed"
  | "vision"
  | "max_hp";

export interface Perk {
  id: PerkType;
  title: string;
  desc: string;
}

export class EnemyType {
  constructor(public archetype: EnemyArchetype = "slasher") {}
}

export class PlayerTag {}
export class EnemyTag {}
export class FogTag {}
