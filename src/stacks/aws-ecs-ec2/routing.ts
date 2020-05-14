import { Output } from "@pulumi/pulumi";
import { ec2, lb } from "@pulumi/awsx";
import abbreviate from "abbreviate";

export type ApplicationListenerForTargetGroup = lb.ApplicationListener & {
  defaultTargetGroup: lb.ApplicationTargetGroup;
};

export function createResourceNames<T extends Record<string, string>>(
  prefix: string,
  suffixes: T,
  maxLength = Infinity
): Record<keyof T, string> {
  const length =
    maxLength -
    Object.entries(suffixes)
      .map(([, suffix]) => suffix.length)
      .reduce((max, value) => Math.max(max, value), 0);

  if (length < 0) {
    throw new Error(
      `Cannot generate names with maximum length ${maxLength}, becuase the given suffixes are too long for that.`
    );
  }

  prefix = abbreviate(prefix, {
    length,
    keepSeparators: true,
  });

  return Object.assign(
    {},
    ...Object.entries(suffixes).map(([key, suffix]) => ({
      [key]: `${prefix}${suffix}`,
    }))
  );
}

export function createApplicationListener(
  resourcePrefix: string,
  { vpc, https }: { vpc?: ec2.Vpc; https?: { certificateArn: string } } = {}
): ApplicationListenerForTargetGroup {
  const name = createResourceNames(
    resourcePrefix,
    {
      alb: "-alb",
      targetGroup: "-alb-target-group",
      targetListener: "-alb-http",
      redirectListener: "-alb-redirect-http",
    },
    24
  );

  const alb = new lb.ApplicationLoadBalancer(name.alb, {
    external: true,
    vpc,
  });

  const targetGroup = alb.createTargetGroup(name.targetGroup, {
    targetType: "instance",
    vpc,
    protocol: "HTTP",
  });

  const protocol = https ? "HTTPS" : "HTTP";

  const listener = targetGroup.createListener(name.targetListener, {
    protocol,
    certificateArn: https?.certificateArn,
  }) as ApplicationListenerForTargetGroup;

  if (protocol !== "HTTP") {
    alb.createListener(name.redirectListener, {
      protocol: "HTTP",
      defaultAction: {
        type: "redirect",
        redirect: {
          protocol,
          statusCode: "HTTP_301",
          port: listener.endpoint.port.apply((port) => `${port}`),
        },
      },
    });
  }

  return listener;
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
