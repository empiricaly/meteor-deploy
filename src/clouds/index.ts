import * as aws from "./aws";
import { Schema } from "/src/utils/schema";

export interface CloudRegistryEntry<Config extends object> {
  getConfigSchema(): Schema<Config>;
  getDefaultConfig(): Config;
}

export type GetConfig<
  Cloud extends CloudRegistryEntry<object>
> = Cloud extends CloudRegistryEntry<infer Config> ? Config : never;

export const clouds = {
  aws: aws as CloudRegistryEntry<aws.Config>,
};

export type CloudName = keyof typeof clouds;
