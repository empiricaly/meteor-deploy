import {
  ExecutionEvents,
  ExecutionReporter,
  Initializer,
  requireNoFailures,
} from "./utils";

export { InitializationStep, ExecutionReporter } from "./utils";
export * from "./pulumi-project";
export * from "./pulumi-stack";

export async function runSequence(
  sequence: ExecutionEvents & Initializer,
  reporter?: ExecutionReporter
) {
  reporter?.enable(sequence);
  try {
    const results = await sequence.execute();
    requireNoFailures(results);
    return results;
  } finally {
    reporter?.disable(sequence);
  }
}
