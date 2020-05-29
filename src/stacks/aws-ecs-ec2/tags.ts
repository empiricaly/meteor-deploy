import { Input, output, Output } from "@pulumi/pulumi";
import { Tags } from "@pulumi/aws";
import { getPackageInfo } from "/src/utils";
import { registerAutoTags } from "/src/clouds/aws";
import { stackType } from "./index";

type ProjectTagOptions = {
  projectName: string;
  stackName: string;
};

export function getProjectTags({
  projectName,
  stackName,
}: ProjectTagOptions): Tags {
  const { name: packageName, version: packageVersion } = getPackageInfo();
  return {
    [`${projectName}:project`]: projectName,
    [`${projectName}:stack-type`]: stackType,
    [`${projectName}:stack-name`]: stackName,
    ...(packageVersion
      ? { [`${packageName}:package-version`]: packageVersion }
      : {}),
  };
}

export function addProjectTags(
  tagOptions: ProjectTagOptions,
  extraTags: Input<Tags> = {}
): Output<Tags> {
  return output(extraTags).apply((extraTags = {}) => ({
    ...getProjectTags(tagOptions),
    ...extraTags,
  }));
}

export function configureTags({
  disableProjectTags,
  optionsForProjectTags,
  tags,
}: {
  disableProjectTags?: boolean;
  optionsForProjectTags: ProjectTagOptions;
  tags?: Input<Tags>;
}) {
  if (!disableProjectTags) {
    tags = addProjectTags(optionsForProjectTags, tags);
  }
  if (tags) {
    registerAutoTags(tags);
  }
}
