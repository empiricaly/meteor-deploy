import { ecr } from "@pulumi/awsx";

export function createContainerRegistry(projectName: string): ecr.Repository {
  return new ecr.Repository(`${projectName}-ecr-repo`);
}
