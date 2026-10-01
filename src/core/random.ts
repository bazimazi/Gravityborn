/** Stable, serializable PRNG used only for gameplay generation. */
export class Random {
  state: number;
  constructor(seed: string | number) {
    let value = 2166136261;
    for (const character of String(seed)) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    this.state = value >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  int(max: number): number {
    return Math.floor(this.next() * max);
  }
  pick<T>(values: readonly T[]): T {
    if (!values.length) throw new Error('Cannot choose from an empty set');
    return values[this.int(values.length)];
  }
  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
