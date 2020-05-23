import { Command } from "commander";
import { install, isInstallable } from "/src/helper-programs";

export default async function (program: Command) {
  program
    .description("Installs prerequisite programs")
    .arguments("<name|name@version> [moreNames...]")
    .action((name, otherNames: string[] = []) => {
      const programs = [name, ...otherNames].map((nameAndVersion) =>
        nameAndVersion.split("@")
      );

      const notInstallable = programs.filter(([name]) => !isInstallable(name));

      if (notInstallable.length > 0) {
        throw new Error(
          `These programs cannot be installed, because they are not known: '${notInstallable.join(
            "', '"
          )}'`
        );
      }

      programs.forEach(([name, version]) => install(name, version));
    });
}
