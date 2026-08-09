# Hive Collapse - ECS Game Design Document

## Project Overview

**Title:** Hive Collapse\
**Engine:** p5.js\
**Architecture:** Entity Component System (ECS)\
**Genre:** Top-down arcade survival shooter

Hive Collapse is an action-focused roguelike shooter where the player
survives waves of evolving alien creatures inside procedurally generated
caves.

The game demonstrates:

-   Cellular Automata
-   Genetic Algorithms
-   Autonomous Agents
-   ECS architecture

The computational concepts directly influence gameplay.

------------------------------------------------------------------------

# Core Gameplay Loop

1.  Generate a cave using Cellular Automata.
2.  Create player, enemies, bullets, and objects as ECS entities.
3.  Run gameplay systems each frame.
4.  Evaluate enemy performance after each wave.
5.  Use Genetic Algorithms to evolve the next enemy generation.
6.  Continue until the player is defeated.

------------------------------------------------------------------------

# ECS Architecture

## Philosophy

Entities contain only identity.

Components contain data.

Systems contain behaviour.

Example:

    Enemy Entity

    Components:
    - Position
    - Velocity
    - Health
    - DNA
    - Fitness
    - AI
    - Collider

The enemy does not have an update function. Systems process all entities
with matching components.

------------------------------------------------------------------------

# Project Structure

    HiveCollapse/

    src/

     core/
       Game.js
       EntityManager.js
       ComponentManager.js
       SystemManager.js

     components/
       Position.js
       Velocity.js
       Health.js
       Collider.js
       Sprite.js
       DNA.js
       Fitness.js
       Weapon.js
       Projectile.js
       AI.js
       Steering.js
       Lifetime.js

     systems/
       MovementSystem.js
       RenderingSystem.js
       CollisionSystem.js
       ShootingSystem.js
       SteeringSystem.js
       EnemyAISystem.js
       GeneticAlgorithmSystem.js
       ParticleSystem.js

     world/
       CaveGenerator.js
       CellularAutomata.js

     ui/
       HUD.js
       EvolutionPanel.js

------------------------------------------------------------------------

# Components

## Position

Stores entity location.

    x
    y

------------------------------------------------------------------------

## Velocity

Stores movement.

    vx
    vy

------------------------------------------------------------------------

## Health

Used by:

-   Player
-   Enemies

Contains:

    current
    maximum

------------------------------------------------------------------------

## DNA

Stores evolutionary traits.

Example:

    speed
    health
    aggression
    attackCooldown
    visionRadius
    dodgeChance

------------------------------------------------------------------------

## Fitness

Stores evolutionary performance.

Example:

    damage dealt
    survival time
    successful attacks
    movement distance

------------------------------------------------------------------------

## AI Component

Stores enemy behaviour state.

Example:

    target
    state

------------------------------------------------------------------------

# Systems

## Movement System

Processes entities containing:

-   Position
-   Velocity

Updates position every frame.

Used by:

-   Player
-   Enemies
-   Bullets
-   Particles

------------------------------------------------------------------------

## Steering System

Implements autonomous agents.

Behaviours:

### Seek

Moves enemies toward player.

### Separation

Prevents enemy overlap.

### Obstacle Avoidance

Keeps enemies away from walls.

### Wander

Creates natural movement.

------------------------------------------------------------------------

# Genetic Algorithm System

Controls enemy evolution.

## Initial Population

Enemies receive random DNA.

Example:

    Enemy A

    speed: 4
    health: 80
    aggression: 0.7

------------------------------------------------------------------------

## Fitness Calculation

Fitness:

    damage dealt
    +
    time survived
    +
    successful attacks
    +
    distance travelled

------------------------------------------------------------------------

## Selection

Keep the strongest individuals.

Default:

    Top 20 percent

------------------------------------------------------------------------

## Crossover

Children inherit genes from parents.

Example:

Parent A:

    speed = 5

Parent B:

    speed = 2

Child:

    speed = 5

------------------------------------------------------------------------

## Mutation

Randomly changes genes.

Example:

    speed += random(-0.5,0.5)

Mutation rate:

    5%

------------------------------------------------------------------------

# Cellular Automata System

Used for cave generation.

## Map

Represent the world as a grid.

    0 = floor
    1 = wall

------------------------------------------------------------------------

## Generation Process

1.  Create random grid.
2.  Count neighbouring walls.
3.  Apply smoothing rules.
4.  Repeat iterations.
5.  Remove disconnected areas.

Rule:

    If wall neighbours >= 5:
        become wall

    Otherwise:
        become floor

------------------------------------------------------------------------

# Entity Types

## Player

Components:

    Position
    Velocity
    Health
    Weapon
    Collider
    Input

------------------------------------------------------------------------

## Enemy

Components:

    Position
    Velocity
    Health
    DNA
    Fitness
    AI
    Steering
    Collider

------------------------------------------------------------------------

## Bullet

Components:

    Position
    Velocity
    Damage
    Collider
    Lifetime

------------------------------------------------------------------------

## Particle

Components:

    Position
    Velocity
    Lifetime
    Sprite

------------------------------------------------------------------------

# Development Milestones

## Milestone 1

Basic ECS framework.

Complete:

-   Entity manager
-   Components
-   Systems
-   Game loop

------------------------------------------------------------------------

## Milestone 2

Playable prototype.

Complete:

-   Player movement
-   Shooting
-   Enemy spawning
-   Collision

------------------------------------------------------------------------

## Milestone 3

Procedural world.

Complete:

-   Cellular Automata caves
-   Collision boundaries
-   Spawn locations

------------------------------------------------------------------------

## Milestone 4

AI systems.

Complete:

-   Steering behaviours
-   Enemy targeting

------------------------------------------------------------------------

## Milestone 5

Evolution.

Complete:

-   DNA components
-   Fitness evaluation
-   Selection
-   Crossover
-   Mutation

------------------------------------------------------------------------

## Final Polish

Add:

-   Particles
-   Screen shake
-   UI
-   Sound
-   Balancing

------------------------------------------------------------------------

# Coding Guidelines

-   Use ES6 JavaScript classes.
-   Keep components data-only.
-   Keep systems responsible for behaviour.
-   Avoid large monolithic classes.
-   Add comments explaining algorithms.
-   Avoid unnecessary global variables.
-   Prioritise readability over optimisation.

------------------------------------------------------------------------

# Success Criteria

The final game should clearly demonstrate:

## Cellular Automata

Different cave layouts every run.

## Genetic Algorithms

Enemy populations visibly evolve.

## Autonomous Agents

Enemies behave naturally.

## ECS

The game architecture supports large numbers of entities cleanly.
