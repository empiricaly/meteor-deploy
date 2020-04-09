export interface EventEmitter<T extends unknown[]> {
  on(handler: EventHandler<T>): this;
  off(handler: EventHandler<T>): this;
}

interface EventHandler<T extends unknown[]> {
  (...args: T): void;
}

export class EventNode<T extends unknown[]> implements EventEmitter<T> {
  private handlers: EventHandler<T>[] = [];

  public on(handler: EventHandler<T>): this {
    this.handlers.push(handler);
    return this;
  }

  public off(handler: EventHandler<T>): this {
    this.handlers = this.handlers.filter((h) => h !== handler);
    return this;
  }

  public trigger(...args: T): boolean {
    this.handlers.forEach((handler) => handler(...args));
    return this.handlers.length > 0;
  }

  public expose(): EventEmitter<T> {
    return this;
  }
}
