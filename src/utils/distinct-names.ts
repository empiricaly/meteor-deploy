export class DistinctNames {
  counts: { [name: string]: number };
  format: (name: string, index: number) => string;

  constructor(format = (name: string, index: number) => `${name} ${index}`) {
    this.counts = {};
    this.format = format;
  }

  useIndex(name: string): number {
    const { [name]: index = 0 } = this.counts;
    this.counts[name] = index + 1;
    return index;
  }

  create(name: string): string {
    const index = this.useIndex(name);
    return this.format(name, index);
  }
}
