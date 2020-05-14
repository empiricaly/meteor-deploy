import { Input } from "@pulumi/pulumi";
import { route53 } from "@pulumi/aws";

export function createDomainRecord(
  resourcePrefix: string,
  {
    name,
    zoneId,
    ttl = 1,
    cname,
  }: { name: string; zoneId: string; ttl?: number; cname: Input<string> }
) {
  return new route53.Record(`${resourcePrefix}-domain`, {
    name,
    type: "CNAME",
    zoneId,
    ttl,
    records: [cname],
  });
}
