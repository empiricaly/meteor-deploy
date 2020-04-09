import { ec2 } from "@pulumi/aws";

export function createKeyPair(
  projectName: string,
  publicKey: string
): ec2.KeyPair {
  return new ec2.KeyPair(`${projectName}-deployer`, { publicKey });
}
