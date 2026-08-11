import { EnemyDNA, DNA, EnemyArchetype } from "../components";

export class GeneticAlgorithmSystem {
  public static evolvePopulation(
    parentDNAs: { dna: EnemyDNA; score: number; archetype: EnemyArchetype }[],
    populationSize: number,
    targetArchetype: EnemyArchetype = EnemyArchetype.SLASHER
  ): DNA[] {
    // Filter parents by matching archetype if available, or fall back to full pool
    const matchingParents = parentDNAs.filter((p) => p.archetype === targetArchetype);
    const pool = matchingParents.length >= 2 ? matchingParents : parentDNAs;

    if (pool.length === 0) {
      return Array.from({ length: populationSize }, () => new DNA());
    }

    // Sort by fitness score descending
    pool.sort((a, b) => b.score - a.score);

    // Elitism: Top 20% survive directly
    const eliteCount = Math.max(1, Math.floor(pool.length * 0.2));
    const elites = pool.slice(0, eliteCount).map((item) => item.dna);

    const nextGeneration: DNA[] = [];

    for (let i = 0; i < populationSize; i++) {
      if (i < elites.length) {
        // Keep elites with minor variance
        nextGeneration.push(new DNA(elites[i]));
      } else {
        // Crossover two parents from elites
        const parentA = elites[Math.floor(Math.random() * elites.length)]!;
        const parentB = elites[Math.floor(Math.random() * elites.length)]!;
        const childDNA = GeneticAlgorithmSystem.crossover(parentA, parentB);
        GeneticAlgorithmSystem.mutate(childDNA, targetArchetype, 0.15); // Role-biased mutation rate
        nextGeneration.push(childDNA);
      }
    }

    return nextGeneration;
  }

  private static crossover(parentA: EnemyDNA, parentB: EnemyDNA): DNA {
    return new DNA({
      speed: Math.random() < 0.5 ? parentA.speed : parentB.speed,
      maxHealth: Math.random() < 0.5 ? parentA.maxHealth : parentB.maxHealth,
      aggression: Math.random() < 0.5 ? parentA.aggression : parentB.aggression,
      visionRadius: Math.random() < 0.5 ? parentA.visionRadius : parentB.visionRadius,
      attackCooldown: Math.random() < 0.5 ? parentA.attackCooldown : parentB.attackCooldown,
      dodgeChance: Math.random() < 0.5 ? parentA.dodgeChance : parentB.dodgeChance,
      healRate: Math.random() < 0.5 ? parentA.healRate : parentB.healRate,
    });
  }

  private static mutate(dna: DNA, archetype: EnemyArchetype, mutationRate: number = 0.15): void {
    // Role-Biased Genetic Evolution
    if (archetype === EnemyArchetype.SHOOTER) {
      // Shooter (ADC): Priority on Attack Speed (lower cooldown), Kiting Speed, and Vision
      if (Math.random() < mutationRate * 1.8) {
        dna.attackCooldown = Math.max(12, Math.min(60, dna.attackCooldown + Math.floor(Math.random() * 8 - 5)));
      }
      if (Math.random() < mutationRate * 1.4) {
        dna.speed = Math.max(1.8, Math.min(4.5, dna.speed + (Math.random() * 0.6 - 0.2)));
      }
      if (Math.random() < mutationRate * 1.4) {
        dna.visionRadius = Math.max(180, Math.min(380, dna.visionRadius + (Math.random() * 50 - 20)));
      }
    } else if (archetype === EnemyArchetype.TANK) {
      // Tank (Roamer): Priority on Max Health, Body Size, Dodge Chance, and Wide Patrol Vision
      if (Math.random() < mutationRate * 1.8) {
        dna.maxHealth = Math.max(80, Math.min(300, dna.maxHealth + Math.floor(Math.random() * 40 - 15)));
      }
      if (Math.random() < mutationRate * 1.4) {
        dna.dodgeChance = Math.max(0.05, Math.min(0.45, dna.dodgeChance + (Math.random() * 0.1 - 0.03)));
      }
      if (Math.random() < mutationRate * 1.4) {
        dna.visionRadius = Math.max(220, Math.min(420, dna.visionRadius + (Math.random() * 60 - 20)));
      }
    } else {
      // Slasher (Top Laner): Priority on Aggressive Rush Speed, 1v1 Trade Damage, and Health Regen
      if (Math.random() < mutationRate * 1.8) {
        dna.speed = Math.max(2.2, Math.min(5.2, dna.speed + (Math.random() * 0.8 - 0.3)));
      }
      if (Math.random() < mutationRate * 1.5) {
        dna.aggression = Math.max(0.4, Math.min(1.0, dna.aggression + (Math.random() * 0.3 - 0.1)));
      }
      if (Math.random() < mutationRate * 1.5) {
        dna.healRate = Math.max(0.1, Math.min(0.8, dna.healRate + (Math.random() * 0.15 - 0.05)));
      }
    }
  }
}
