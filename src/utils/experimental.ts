const envVar = "METEOR_DEPLOY_EXPERIMENTAL_MODE";

export function isExperimentalMode(): boolean {
  return !!process.env[envVar];
}

export function requireExperimentalModeForFeature(feature: string): void {
  if (!isExperimentalMode()) {
    throw new Error(
      `The feature '${feature}' is experimental and can therefore only be used with ${envVar}=1`
    );
  }
}
