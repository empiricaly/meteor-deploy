declare module "abbreviate" {
  export default function abbreviate(
    str: string,
    opts: {
      length?: number;
      keepSeparators?: boolean;
      strict?: boolean;
    }
  ): string;
}
