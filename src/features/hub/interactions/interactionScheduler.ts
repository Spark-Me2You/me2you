/**
 * Interaction scheduler
 * Every so often, picks two free walkers standing close together and runs an
 * InteractionDefinition on them. Owns no Pixi objects; walkers are driven through
 * the InteractionActor surface.
 */

import type { InteractionActor, InteractionDefinition } from "./types";

export interface InteractionSchedulerOptions {
  /** How often (frames) to look for a new pair. */
  checkIntervalFrames: number;
  /** Chance a check actually starts something, so interactions feel occasional. */
  startChance: number;
  /** Frames a walker must wait after an interaction before joining another. */
  cooldownFrames: number;
  /** Most interactions allowed at once in a room. */
  maxConcurrent: number;
  /** Injectable for tests. */
  random: () => number;
}

export const DEFAULT_INTERACTION_OPTIONS: InteractionSchedulerOptions = {
  checkIntervalFrames: 120,
  startChance: 0.35,
  cooldownFrames: 60 * 20,
  maxConcurrent: 2,
  random: Math.random,
};

interface ActiveInteraction {
  definition: InteractionDefinition;
  a: InteractionActor;
  b: InteractionActor;
  elapsed: number;
}

export class InteractionScheduler {
  private readonly definitions: InteractionDefinition[];
  private readonly options: InteractionSchedulerOptions;
  private active: ActiveInteraction[] = [];
  private cooldowns = new Map<string, number>();
  private sinceCheck = 0;

  constructor(
    definitions: InteractionDefinition[],
    options: Partial<InteractionSchedulerOptions> = {},
  ) {
    this.definitions = definitions;
    this.options = { ...DEFAULT_INTERACTION_OPTIONS, ...options };
  }

  isInteracting(id: string): boolean {
    return this.active.some((it) => it.a.id === id || it.b.id === id);
  }

  get activeCount(): number {
    return this.active.length;
  }

  /** Advance running interactions and maybe start a new one among `actors`. */
  tick(dt: number, actors: InteractionActor[]): void {
    this.cooldowns.forEach((left, id) => {
      if (left - dt <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, left - dt);
    });

    this.active = this.active.filter((it) => {
      it.elapsed += dt;
      const progress = Math.min(1, it.elapsed / it.definition.durationFrames);
      it.definition.update(it.a, it.b, progress);
      if (progress < 1) return true;
      this.finish(it);
      return false;
    });

    if (this.definitions.length === 0) return;
    this.sinceCheck += dt;
    if (this.sinceCheck < this.options.checkIntervalFrames) return;
    this.sinceCheck = 0;
    if (this.active.length >= this.options.maxConcurrent) return;
    if (this.options.random() >= this.options.startChance) return;

    this.tryStart(actors);
  }

  /** Release everyone, e.g. when leaving a room or tearing down the hub. */
  cancelAll(): void {
    this.active.forEach((it) => this.finish(it));
    this.active = [];
  }

  /** Drop interactions involving an actor that left (removed walker, room change). */
  cancelFor(id: string): void {
    this.active = this.active.filter((it) => {
      if (it.a.id !== id && it.b.id !== id) return true;
      this.finish(it);
      return false;
    });
  }

  private isFree(actor: InteractionActor): boolean {
    return !actor.isBusy && !this.cooldowns.has(actor.id) && !this.isInteracting(actor.id);
  }

  private tryStart(actors: InteractionActor[]): void {
    const free = actors.filter((actor) => this.isFree(actor));
    const candidates: { a: InteractionActor; b: InteractionActor; fits: InteractionDefinition[] }[] = [];

    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i];
        const b = free[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const fits = this.definitions.filter(
          (def) => distance <= def.maxDistance && (def.canStart?.(a, b) ?? true),
        );
        if (fits.length > 0) candidates.push({ a, b, fits });
      }
    }
    if (candidates.length === 0) return;

    const pick = candidates[Math.floor(this.options.random() * candidates.length)];
    const definition = this.pickWeighted(pick.fits);

    pick.a.setControlled(true);
    pick.b.setControlled(true);
    definition.start?.(pick.a, pick.b);
    this.active.push({ definition, a: pick.a, b: pick.b, elapsed: 0 });
  }

  private pickWeighted(definitions: InteractionDefinition[]): InteractionDefinition {
    const total = definitions.reduce((sum, def) => sum + def.weight, 0);
    let roll = this.options.random() * total;
    for (const def of definitions) {
      roll -= def.weight;
      if (roll < 0) return def;
    }
    return definitions[definitions.length - 1];
  }

  private finish({ definition, a, b }: ActiveInteraction): void {
    definition.end?.(a, b);
    for (const actor of [a, b]) {
      actor.setOffset(0, 0);
      actor.setRotation(0);
      actor.setControlled(false);
      this.cooldowns.set(actor.id, this.options.cooldownFrames);
    }
  }
}
