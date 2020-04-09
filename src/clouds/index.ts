import * as aws from "./aws";
import { Schema } from "/src/utils/schema";

export interface CloudRegistryEntry<Config extends object> {
  getConfigSchema(): Schema<Config>;
}

export const clouds = {
  aws: aws as CloudRegistryEntry<aws.Config>,
};

export type CloudName = keyof typeof clouds;
