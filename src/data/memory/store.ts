import { randomUUID } from "node:crypto";

export type Clock = () => Date;

/** In-memory backing store. One Map per table, keyed by id. */
export class MemoryStore {
  readonly tables = new Map<string, Map<string, Record<string, unknown>>>();

  constructor(public clock: Clock = () => new Date()) {}

  table<T extends { id: string }>(name: string): Map<string, T> {
    let t = this.tables.get(name);
    if (!t) {
      t = new Map();
      this.tables.set(name, t);
    }
    return t as Map<string, T>;
  }

  now(): string {
    return this.clock().toISOString();
  }

  today(): string {
    return this.clock().toISOString().slice(0, 10);
  }

  newId(): string {
    return randomUUID();
  }

  clear(): void {
    this.tables.clear();
  }
}
