import inquirer from "inquirer";
import { Question, EventEmitter } from "/src/utils";
import { describeStep, InitializationStep } from "./initialization_step";

export type ChallengedInitializationStep = {
  step: InitializationStep;
  execute: boolean;
  question?: Question | null;
};

export type ExecutedInitializationStep = {
  step: InitializationStep;
  executed: boolean;
  executionError?: Error;
};

export type FailedInitializationStep = ExecutedInitializationStep & {
  executionError: Error;
};

export type ExecutionOptions = {
  challenge?: boolean;
};

export interface Initializer {
  challenge(
    _inquirer?: typeof inquirer
  ): Promise<ChallengedInitializationStep[]>;

  execute(options?: ExecutionOptions): Promise<ExecutedInitializationStep[]>;
}

export interface ExecutionEvents {
  executionStart: EventEmitter<[InitializationStep]>;
  executionEnd: EventEmitter<[InitializationStep]>;
  executionSuccess: EventEmitter<[InitializationStep]>;
  error: EventEmitter<[unknown, InitializationStep]>;
}

function isFailure(
  step: ExecutedInitializationStep
): step is FailedInitializationStep {
  return step.executionError !== undefined;
}

export function executionFailures(
  steps: ExecutedInitializationStep[]
): FailedInitializationStep[] {
  return steps.filter(isFailure);
}

export function requireNoFailures(steps: ExecutedInitializationStep[]): void {
  const failures = executionFailures(steps);

  if (failures.length > 0) {
    throw new Error(
      `Project Initialization Failed, because ${
        failures.length
      } step(s) encountered an error:\n ${failures
        .map(
          ({ executionError, step }) =>
            `${describeStep(step)}: ${executionError?.stack || executionError}`
        )
        .join("\n")}`
    );
  }
}
