import { ec2 } from "@pulumi/awsx";
import { SecurityGroupRuleLocation } from "@pulumi/awsx/ec2/securityGroupRule";

const PORTS = {
  nfs: new ec2.TcpPorts(2049),
};

export function createVpc(projectName: string): ec2.Vpc {
  return new ec2.Vpc(`${projectName}-vpc`, { subnets: [{ type: "public" }] });
}

export function createSecurityGroup(
  projectName: string,
  options?: ec2.SecurityGroupArgs
): ec2.SecurityGroup {
  return new ec2.SecurityGroup(`${projectName}-sg`, options);
}

export function addIngressRule(
  sg: ec2.SecurityGroup,
  name: string,
  source: SecurityGroupRuleLocation,
  port: ec2.SecurityGroupRulePorts | keyof typeof PORTS,
  description?: string
): ec2.SecurityGroupRule {
  if (typeof port === "string") {
    port = PORTS[port];
  }

  return ec2.SecurityGroupRule.ingress(
    `efs-nfs`,
    sg,
    source,
    port,
    description
  );
}

export function allowEfsAccess(
  sg: ec2.SecurityGroup,
  subnets: ec2.Subnet[]
): ec2.SecurityGroupRule {
  return addIngressRule(
    sg,
    "efs-nfs",
    {
      cidrBlocks: subnets.map(({ subnet }) => subnet.cidrBlock),
    },
    "nfs",
    "Allow EFS connection"
  );
}
