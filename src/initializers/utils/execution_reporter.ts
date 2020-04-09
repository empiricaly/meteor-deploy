import { ExecutionEvents } from "./initializer";
import { InitializationStep, describeStep } from "./initialization_step";

export class ExecutionReporter {
  constructor(private log: (msg: string) => void = console.log) {}

  protected describe(event: string, step: InitializationStep): this {
    this.log(`${event}: ${describeStep(step)}`);
    return this;
  }

  private createHandler(event: string): (step: InitializationStep) => void {
    return (step) => this.describe(event, step);
  }

  private readonly handlers = {
    executionStart: this.createHandler("Started Execution"),
    executionEnd: this.createHandler("Ended Execution"),
    executionSuccess: this.createHandler("Execution Successful"),
    error: (error: unknown, step: InitializationStep) =>
      this.describe("Execution Failed", step),
  };

  enable(emitter: ExecutionEvents): this {
    Object.entries(this.handlers).forEach(([name, handler]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter[name as keyof ExecutionEvents].on(handler as any);
    });
    return this;
  }

  disable(emitter: ExecutionEvents): this {
    Object.entries(this.handlers).forEach(([name, handler]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter[name as keyof ExecutionEvents].off(handler as any);
    });
    return this;
  }
}
