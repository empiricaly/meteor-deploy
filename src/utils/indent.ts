import detectIndent, { Indent as _Indent } from "detect-indent";

export type IndentChar = "\t" | " ";

const INDENT_TYPES: Record<NonNullable<_Indent["type"]>, IndentChar> = {
  tab: "\t",
  space: " ",
};

export class Indent {
  char: IndentChar;
  count: number;

  static Default = new Indent({ char: " ", count: 2 });

  static detectFromContent(content: string): Indent | null {
    const { type, amount } = detectIndent(content);
    return type
      ? new Indent({
          char: INDENT_TYPES[type],
          count: amount,
        })
      : null;
  }

  constructor({ char, count }: { char: IndentChar; count: number }) {
    this.char = char;
    this.count = count;
  }

  render(): string {
    let str = "";
    for (let i = 0; i !== this.count; i++) {
      str += this.char;
    }
    return str;
  }
}
