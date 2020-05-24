export type PulumiProjectConfigFileObject = {
  name: string;
  runtime:
    | "nodejs"
    | {
        name: "nodejs";
        options?: {
          /**
           * Controls whether to use ts-node to execute sources.
           * @default true
           */
          typescript?: boolean;
        };
      };
  /**
   * A friendly description about your project.
   */
  description?: string;
  main?: string;
  /**
   * Directory to store stack-specific configuration files, relative to location of Pulumi.yaml.
   */
  config?: string;
  /**
   * Configuration for project state backend.
   */
  backend?: {
    /**
     * Explicitly specify backend url like https://pulumi.acmecorp.com, file:///app/data, etc.
     */
    url: string;
  };
};

export function pulumiStackConfig(stack: string, config: object): object {
  return Object.assign(
    {},
    ...Object.entries(config).map(([key, value]) => ({
      [`${stack}:${key}`]: value,
    }))
  );
}
