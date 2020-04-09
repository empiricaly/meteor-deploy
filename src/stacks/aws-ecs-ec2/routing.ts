import { Output } from "@pulumi/pulumi";
import { ec2, lb } from "@pulumi/awsx";

export function createApplicationListener(
  projectName: string,
  { vpc }: { vpc: ec2.Vpc }
): lb.ApplicationListener {
  const protocol = "HTTP";

  return new lb.ApplicationListener(`${projectName}-lb`, {
    protocol,
    vpc,
    targetGroup: {
      targetType: "instance",
      vpc,
      protocol,
    },
  });
}

export function getUrl({
  endpoint,
  listener: { protocol },
}: lb.ApplicationListener): Output<string> {
  return endpoint.apply(({ hostname, port }) =>
    protocol.apply(
      (protocol = "http") =>
        `${protocol.toLowerCase()}://${hostname}${
          port !== 80 ? `:${port}` : ""
        }`
    )
  );
}
