# Project Submission: Hive Collapse

## **Part 1: Planning and Write-Up**

### **1. Introduction / Inspiration**
- For this project, we started the planning stage by identifying compelling game loops that combine fast-paced arcade shooting with deep algorithmic systems.
- Our original list of ideas included:
  1. Cellular Automata Dungeon Crawler
  2. Vampire Survivors-style Horde Survival
  3. MOBA-inspired Teamfight Arena (ADC, Top Laner, Roamer roles)
- We decided to combine all three into **Hive Collapse**: a top-down roguelike shooter where alien enemies procedurally evolve their genetic DNA across cellular cave levels using a custom Entity Component System (ECS) engine.
- **The Twist**: Alien enemies evolve across waves using real **Genetic Algorithms (GA)**, adapting their speed, health, aggression, attack speed, and kiting spacing based on their performance in past waves. Furthermore, enemies adopt specific MOBA roles (Top Laner Slashers, ADC Shooters, and Roamer Tanks).
- **Adaptation**: We adjusted traditional horde games for a tactical format with limited 5-bullet magazines, instant ammo refills on ranged kills, directional right-click melee slashes, 20% lifesteal, and dynamic Fog of War raycasting line-of-sight.

---

### **2. Game Idea, Design and Mechanics**
- **Core Loop**: Clear waves of procedurally evolved alien organisms in cellular caves. Clearing each wave triggers a **Level Up Perk Reward Modal**, allowing players to choose 1 of 3 randomized upgrades before entering a freshly generated cavern.
- **MOBA Enemy Archetypes & Behaviors**:
  - **Slashers (Top Laners)**: Aggressive melee rushers. High speed and health regeneration; relentlessly pursue the player for 1v1 trades.
  - **Shooters (ADCs)**: Ranged backliners. Maintain strict 200px kiting distance, step back when the player engages, and fire energy projectiles.
  - **Tanks (Roamers)**: Heavy body-blockers. Patrol the cavern with high health (up to 300 HP) and intercept player bullets to protect squishy Shooters.
- **Combat Mechanics**:
  - **Weapon Magazine**: 5-bullet capacity with manual (`R`) or auto-reload.
  - **Refill on Kill**: Landing a ranged kill instantly restores the magazine to 5/5 bullets.
  - **Melee Slash (Right-Click)**: High-risk short-range 75° cone slash dealing 35 damage with 1.0s cooldown (does not refill ammo, 50% lifesteal efficiency).
  - **Lifesteal**: 20% of damage dealt is converted back into player HP.
- **Fog of War**: 360° Bresenham raycasting calculates line-of-sight. Unexplored cave tiles remain pitch black (`#000000`), explored tiles display dim memory fog, and lit tiles reveal high-contrast flat colors.
- **UI Design**: A modern DOM sidebar dashboard displays real-time Player Health, Ammo, Level, Wave Info, and Perks Earned, while keeping the main 800x600 canvas clean for pure gameplay. Detailed Genetic evolution metrics are accessible via a dedicated **DNA Lab** modal button.

---

### **3. Philosophy of Game Design**
- **Pre-Luck vs. Post-Luck**:
  - **Pre-Luck (Transparency)**: Applied through Cellular Automata cave layouts and explicit wave composition indicators (`WAVE 1: SLASHERS`, `WAVE 2: SHOOTERS`, etc.). Players clearly observe enemy archetypes and cavern structures before engaging, enabling strategic positioning.
  - **Post-Luck (Controlled Variance)**: Kept minimal to ensure player skill dominates. The primary post-luck element is the 3-card perk selection presented upon clearing a wave.
- **High-Contrast Flat Palette (No Stroke Outlines)**: Tile outlines are omitted (`p.noStroke()`) to maximize visual contrast between electric indigo wall tiles, slate floor tiles, crimson slashers, purple diamond shooters, and electric cyan projectiles.

---

### **4. Schedule and Division of Work**
- **Milestone 1 (Architecture & Caves)**:
  - Custom ECS Core (`World`, `EntityAllocator`, `SparseSet`, `Query`).
  - Cellular Automata cave generation with 4-step smoothing and flood-fill connectivity verification.
- **Milestone 2 (MOBA AI & Genetic Evolution)**:
  - Steering behaviors (Seek, Flee, Separation, Kiting).
  - Role-biased Genetic Algorithm evolution with archetype-specific fitness functions.
- **Milestone 3 (Combat, Fog of War & UI)**:
  - Bresenham raycasting Fog of War system.
  - 5-bullet capacity, right-click melee slash arc, ranged kill refill, and lifesteal.
  - DOM sidebar dashboard and DNA Lab modal integration.

---

## **Part 2: Execution**

### **Stage 1: Custom Generational Mini-ECS Core**
We engineered a zero-dependency, cache-friendly Entity Component System written in TypeScript. It uses a generational index allocator to eliminate entity recycling hazards and Sparse Sets for $O(1)$ component lookup and removal.

```typescript
// Custom SparseSet storage snippet (src/ecs/SparseSet.ts)
export class SparseSet<T> {
  private sparse: number[] = [];
  private dense: number[] = [];
  private data: T[] = [];

  public insert(entity: Entity, value: T): void {
    const idx = entity.index;
    if (this.has(entity)) {
      this.data[this.sparse[idx]!] = value;
      return;
    }
    this.sparse[idx] = this.dense.length;
    this.dense.push(idx);
    this.data.push(value);
  }
}
```

---

### **Stage 2: Archetype-Specific Genetic Algorithm Evolution**
We implemented role-biased genetic selection. At the end of each wave, parent organisms are evaluated using role-weighted fitness functions:

```typescript
// Archetype-specific fitness scoring (src/components/index.ts)
public computeScore(archetype: EnemyArchetype = "slasher"): number {
  if (archetype === "shooter") {
    // Shooter (ADC): Rewards Ranged DPS, Attack Count, and Kiting Distance
    return this.damageDealt * 4.0 + this.attackCount * 8.0 + this.distanceTraveled * 1.2 + this.timeSurvived * 1.0;
  } else if (archetype === "tank") {
    // Tank (Roamer): Rewards Survival, Roaming Coverage, and Damage Absorption
    return this.timeSurvived * 2.5 + this.distanceTraveled * 1.5 + this.damageDealt * 1.5 + this.hpHealed * 2.0;
  } else {
    // Slasher (Top Laner): Rewards Aggressive Melee Trade & Health Regeneration
    return this.damageDealt * 3.0 + this.hpHealed * 3.5 + this.distanceTraveled * 0.8 + this.timeSurvived * 1.0;
  }
}
```

---

### **Stage 3: First Milestone Progress Update**
For the first milestone, all core mechanics were integrated and verified type-safe (`pnpm build` clean):
- Custom ECS framework complete with bitmask query iteration.
- Procedural cave map generation working cleanly with wall sliding movement.
- Basic AI steering and projectile combat active.

---

### **Stage 4: Final Project Polish & Balances**
In the final stage, we refined gameplay pacing and visual presentation:
- **Map Scaling**: Reduced cavern map to 40x30 tiles (800x600 resolution canvas) for tight, action-packed combat.
- **Wave Pacing**: Wave sizes randomized strictly between 5 and 8 enemies.
- **Melee Slash**: Implemented right-click 75° arc slash with visual rendering and 1.0s cooldown.
- **DNA Lab Modal**: Created an archetype-split modal (`[D] DNA Lab`) displaying specialized evolution metrics for Slashers, Shooters, and Tanks.

---

## **Part 3: Codebase Design**

### **Repository Structure**
- `src/ecs/`: Core ECS engine architecture (`Entity.ts`, `SparseSet.ts`, `Component.ts`, `Query.ts`, `World.ts`, `System.ts`).
- `src/components/`: ECS component registry (`Position`, `Velocity`, `Health`, `Weapon`, `MeleeAttack`, `DNA`, `Fitness`, `AI`, `Steering`, `Vision`, `FogOfWarComponent`, `PlayerXp`).
- `src/world/`: Cellular Automata cave map generator (`CaveGenerator.ts`).
- `src/systems/`: ECS system pipeline:
  - MovementSystem.ts: Predictive axis-aligned wall sliding.
  - SteeringSystem.ts: Seek, flee, separation, and kiting vector math.
  - EnemyAISystem.ts: MOBA role state machine and projectile firing.
  - ShootingSystem.ts: Left-click shooting, right-click melee slash arc, and manual/auto reloading.
  - CollisionSystem.ts: Bullet-wall collision, enemy hit detection, player lifesteal, and kill ammo refills.
  - FogOfWarSystem.ts: 360° raycasting visibility calculator.
  - RenderingSystem.ts: Flat outline-free canvas renderer, distinct bullets, visual slash arcs, Start Screen, Help Guide, and Game Over overlays.
  - GeneticAlgorithmSystem.ts: Role-biased selection, crossover, and mutation algorithms.
- `src/main.ts`: Application entry point managing p5 canvas lifecycle, native DOM input listeners, and DOM sidebar updates.

---

## **Part 4: How to Play**

### **Play Instructions & Notes**
- **Movement**: Use **WASD** or **ARROW KEYS** to move your character through the cavern.
- **Ranged Shooting**: **LEFT MOUSE CLICK** or **SPACEBAR** to fire energy bullets toward your mouse cursor.
- **Melee Slash**: **RIGHT MOUSE CLICK** to unleash a high-damage 75° cone melee slash (35 damage, 1.0s cooldown).
- **Reloading**: Press **Key 'R'** to reload your 5-bullet magazine. Ranged kills instantly restore your magazine to full capacity.
- **DNA Lab**: Click the **DNA Lab** button on the sidebar to view live genetic evolution metrics split across Slasher, Shooter, and Tank archetypes.
- **Player Guide**: Click the **Player Guide** button on the sidebar to inspect game controls and mechanics.
- **Restarting**: If killed, press **Key 'R'** or **SPACEBAR** on the Game Over screen to restart.
