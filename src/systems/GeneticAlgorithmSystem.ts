import { EnemyDNA, DNA } from "../components";

export class GeneticAlgorithmSystem {
  public static evolvePopulation(parentDNAs: { dna: EnemyDNA; score: number }[], populationSize: number): DNA[] {
    if (parentDNAs.length === 0) {
      return Array.from({ length: populationSize }, () => new DNA());
    }

    // Sort by fitness score descending
    parentDNAs.sort((a, b) => b.score - a.score);

    // Elitism: Top 20% survive directly
    const eliteCount = Math.max(1, Math.floor(parentDNAs.length * 0.2));
    const elites = parentDNAs.slice(0, eliteCount).map((item) => item.dna);

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
        GeneticAlgorithmSystem.mutate(childDNA, 0.1); // 10% mutation rate for visible gameplay evolution
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

  private static mutate(dna: DNA, mutationRate: number = 0.1): void {
    if (Math.random() < mutationRate) {
      dna.speed = Math.max(1.0, Math.min(5.0, dna.speed + (Math.random() * 0.8 - 0.4)));
    }
    if (Math.random() < mutationRate) {
      dna.maxHealth = Math.max(20, Math.min(200, dna.maxHealth + Math.floor(Math.random() * 30 - 15)));
    }
    if (Math.random() < mutationRate) {
      dna.aggression = Math.max(0.1, Math.min(1.0, dna.aggression + (Math.random() * 0.2 - 0.1)));
    }
    if (Math.random() < mutationRate) {
      dna.visionRadius = Math.max(80, Math.min(350, dna.visionRadius + (Math.random() * 40 - 20)));
    }
    if (Math.random() < mutationRate) {
      dna.attackCooldown = Math.max(15, Math.min(90, dna.attackCooldown + Math.floor(Math.random() * 10 - 5)));
    }
    if (Math.random() < mutationRate) {
      dna.dodgeChance = Math.max(0.0, Math.min(0.6, dna.dodgeChance + (Math.random() * 0.1 - 0.05)));
    }
    if (Math.random() < mutationRate) {
      dna.healRate = Math.max(0.05, Math.min(0.5, dna.healRate + (Math.random() * 0.1 - 0.05)));
    }
  }
}
