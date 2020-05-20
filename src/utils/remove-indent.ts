export function removeIndent(text: string) {
  text = text
    .replace(/^ +\n/, "\n")
    .replace(/\n +\n/g, "\n\n")
    .replace(/\n +$/g, "\n");

  const commonIndent: number = (text.match(/^\s+|\n +/g) || [])
    .map((str) => str.replace(/^\n/g, "").length)
    .reduce((min, len) => Math.min(min, len), Infinity);

  return text
    .replace(new RegExp(`^ {${commonIndent}}`, "g"), "")
    .replace(new RegExp(`\\n {${commonIndent}}`, "g"), "\n");
}
