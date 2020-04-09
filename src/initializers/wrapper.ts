import {
  ExecutionEvents,
  InitializationStep,
  Initializer,
} from "./utils/initializer";
import { EventEmitter } from "/src/utils/events";

export class Wrapper<T extends Initializer & ExecutionEvents>
  implements Initializer, ExecutionEvents {
  public readonly error: EventEmitter<[unknown, InitializationStep]>;
  public readonly executionSuccess: EventEmitter<[InitializationStep]>;
  public readonly executionEnd: EventEmitter<[InitializationStep]>;
  public readonly executionStart: EventEmitter<[InitializationStep]>;

  constructor(protected core: T) {
    this.error = core.error;
    this.executionSuccess = core.executionSuccess;
    this.executionEnd = core.executionEnd;
    this.executionStart = core.executionStart;
  }

  challenge(
    ...args: Parameters<Initializer["challenge"]>
  ): ReturnType<Initializer["challenge"]> {
    return this.core.challenge(...args);
  }

  execute(
    ...args: Parameters<Initializer["execute"]>
  ): ReturnType<Initializer["execute"]> {
    return this.core.execute(...args);
  }
}
