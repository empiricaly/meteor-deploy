import inquirer from "inquirer";

import { DistinctNames, Question, EventNode } from "/src/utils";
import {
  ChallengedInitializationStep,
  describeStep,
  ExecutionEvents,
  ExecutionOptions,
  InitializationStep,
  Initializer,
} from "./utils";

export class CoreInitializer implements Initializer, ExecutionEvents {
  private steps: InitializationStep[] = [];

  error = new EventNode<[unknown, InitializationStep]>();
  executionStart = new EventNode<[InitializationStep]>();
  executionEnd = new EventNode<[InitializationStep]>();
  executionSuccess = new EventNode<[InitializationStep]>();

  addStep(step: InitializationStep): this {
    this.steps.push(step);
    return this;
  }

  static questionStep(step: InitializationStep): Question | null {
    const { canSkip, warning } = step;

    return canSkip || warning
      ? {
          type: "confirm",
          message: `Execute [${describeStep(step)}]? ${
            warning && `Warning: ${warning}`
          }`,
          default: !warning,
        }
      : null;
  }

  async challenge(
    _inquirer = inquirer
  ): Promise<ChallengedInitializationStep[]> {
    const names = new DistinctNames();

    const challengedSteps = this.steps.map((step) => {
      const question = (this
        .constructor as typeof CoreInitializer).questionStep(step);

      const name = names.create(step.type);

      return { step, question: question && { name, ...question } };
    });

    const questions = challengedSteps
      .map(({ question }) => question)
      .filter((value) => value) as Question[];
    const answers = await _inquirer.prompt(questions);

    return challengedSteps.map(({ question, step }) => ({
      step,
      question,
      execute: !question || answers[question.name],
    }));
  }

  protected executeStep(step: InitializationStep): this {
    const { run } = step;

    this.executionStart.trigger(step);

    try {
      run();
    } catch (error) {
      this.error.trigger(error, step);
      throw error;
    } finally {
      this.executionEnd.trigger(step);
    }

    this.executionSuccess.trigger(step);

    return this;
  }

  async execute({ challenge }: ExecutionOptions = {}): Promise<
    { step: InitializationStep; executed: boolean; executionError?: Error }[]
  > {
    const challengedSteps: ChallengedInitializationStep[] = challenge
      ? await this.challenge()
      : this.steps.map((step) => ({
          step,
          execute: true,
        }));

    return challengedSteps.map(({ execute, step }) => {
      let executionError;
      if (execute) {
        try {
          this.executeStep(step);
        } catch (error) {
          executionError = error;
        }
      }

      return {
        step,
        executed: execute,
        executionError,
      };
    });
  }
}
