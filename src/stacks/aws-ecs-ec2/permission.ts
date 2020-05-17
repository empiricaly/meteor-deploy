import { iam } from "@pulumi/aws";

function getPolicyArnName(arn: string): string | null {
  const [, name = null] = arn.match(/^arn:aws:iam::aws:policy\/(.*)$/i) || [];
  return name;
}

export function createIamInstanceProfile(
  resourcePrefix: string,
  role: iam.Role,
  policyDocumentsOrArns: (iam.RolePolicy | string)[]
): iam.InstanceProfile {
  const policies: iam.RolePolicy[] = policyDocumentsOrArns.filter(
    (item): item is iam.RolePolicy => iam.RolePolicy.isInstance(item)
  );

  const policyAttachments = policyDocumentsOrArns
    .filter((item): item is string => typeof item === "string")
    .map(
      (policyArn) =>
        new iam.RolePolicyAttachment(
          `${resourcePrefix}-attach-${getPolicyArnName(policyArn)}`,
          { role, policyArn }
        )
    );

  return new iam.InstanceProfile(
    resourcePrefix,
    { role },
    { dependsOn: [...policyAttachments, ...policies] }
  );
}
