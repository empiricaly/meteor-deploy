function convertBase(n: number, base: number): number[] {
  const digits = [];
  while (n >= base) {
    const digit = n % base;
    digits.unshift(digit);
    n = (n - digit) / base - 1;
  }
  digits.unshift(n);
  return digits;
}

function digitsToString(chars: number[], offsetChar = "a"): string {
  const offset = offsetChar.charCodeAt(0);
  return chars.map((char) => String.fromCharCode(char + offset)).join("");
}

/** Generates a device name for a device of a given index.
 *
 * @param index
 * @param firstAllowed The first device name that is available for allocation. This is the device where the index is
 * offset from.
 */

export function deviceName(index: number, firstAllowed = "/dev/xvda"): string {
  const offset = "a".charCodeAt(0);
  const n = firstAllowed.charCodeAt(firstAllowed.length - 1) + index - offset;
  // now break up in into base (number of letters in alphabet)
  const chars = convertBase(n, "z".charCodeAt(0) - offset + 1);
  return (
    firstAllowed.substr(0, firstAllowed.length - 1) + digitsToString(chars)
  );
}
