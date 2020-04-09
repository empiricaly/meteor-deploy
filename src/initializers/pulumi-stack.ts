import { Wrapper } from "./wrapper";
import path from "path";
import { leastChangeCompare, pulumiStackConfig, sortObject } from "/src/utils";
import { FileInitializer } from "./file-initializer";

export class PulumiStackConfigurator extends Wrapper<FileInitializer> {
  static create(simulation?: boolean): PulumiStackConfigurator {
    return new this(FileInitializer.create(simulation));
  }

  addStack({
    stackName,
    config,
    meteorDirectory = process.cwd(),
  }: {
    stackName: string;
    meteorDirectory?: string;
    config: {
      [projectName: string]: object;
    };
  }): this {
    this.core.extendConfig(
      path.join(meteorDirectory, `Pulumi.${stackName}.yaml`),
      ({ config: existingConfig = {}, ...otherProps }: { config?: object }) => {
        const newConfig = Object.assign(
          {},
          ...Object.entries(config).map(([key, value]) =>
            pulumiStackConfig(key, value)
          )
        );

        return sortObject({
          config: sortObject(
            {
              ...existingConfig,
              ...newConfig,
            },
            leastChangeCompare(existingConfig)
          ),
          ...otherProps,
        });
      },
      {
        warning: null,
      }
    );

    return this;
  }
}
