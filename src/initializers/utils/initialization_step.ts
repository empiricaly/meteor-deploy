import { humanizePath } from "/src/utils";

export type CommandStepType = "Execute Command";

export type FilesystemStepType =
  | "Create File"
  | "Modify File"
  | "Delete File"
  | "Delete Directory"
  | "Link File"
  | "Link Directory";

export type InitializationStepType = FilesystemStepType | CommandStepType;

type CommonInitializationParams = {
  targetPath: string;
  description: string;
  warning?: string | null;
  canSkip?: boolean;
  challenge?: boolean;
  run(): void;
  rollback?: InitializationStep;
};

export type FileInitializationStep = {
  type: FilesystemStepType;
  command?: undefined;
} & CommonInitializationParams;

export type CommandInitializationStep = {
  type: CommandStepType;
  command: string;
} & CommonInitializationParams;

export type InitializationStep =
  | FileInitializationStep
  | CommandInitializationStep;

export function describeStep(
  { type, targetPath, description, command }: InitializationStep,
  { cwd = process.cwd() } = {}
): string {
  const pathDescription = `Path: '${humanizePath(targetPath, cwd)}'`;
  const commandDescription = command ? `Command: '${command}'` : "";

  return `${type}: (${[commandDescription, pathDescription]
    .filter((d) => d)
    .join(" ")}) ${description}`;
}
