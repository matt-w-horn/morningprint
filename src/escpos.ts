// Shared ESC/POS command table and low-level helpers.
//
// The printer is an Epson TM-T20III (80mm, CP437). Every entry below is a raw
// byte sequence; see docs/epson-tm-t20iii-technical-reference-guide.pdf. Keep the
// byte values verbatim — they are not arbitrary.

export const CMD = {
  INIT: [0x1b, 0x40],
  CP437: [0x1b, 0x74, 0x00],

  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],

  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],

  INVERT_ON: [0x1d, 0x42, 0x01], // White text on black background
  INVERT_OFF: [0x1d, 0x42, 0x00],

  // Font Sizes
  SIZE_NORMAL: [0x1d, 0x21, 0x00], // Fits ~48 Chars
  SIZE_DOUBLE_HEIGHT: [0x1d, 0x21, 0x01], // Fits ~48 Chars (Tall)
  SIZE_2X: [0x1d, 0x21, 0x11], // Fits ~24 Chars (Big)

  FEED_LINES: (n: number): number[] => [0x1b, 0x64, n],
  CUT_PAPER: [0x1d, 0x56, 0x42, 0x00],

  // Line Spacing
  SET_LINE_SPACING: (n: number): number[] => [0x1b, 0x33, n],
  RESET_LINE_SPACING: [0x1b, 0x32],

  GET_BORDER_TOP: function (): number[] {
    const line = [0xc9];
    for (let i = 0; i < 40; i++) line.push(0xcd);
    line.push(0xbb);
    line.push(0x0a);
    return line;
  },

  GET_BORDER_BOTTOM: function (): number[] {
    const line = [0xc8];
    for (let i = 0; i < 40; i++) line.push(0xcd);
    line.push(0xbc);
    line.push(0x0a);
    return line;
  },
};

// Map a string to its raw byte sequence (one byte per UTF-16 code unit). The
// caller is responsible for staying within the printer's CP437 code page.
export function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  return bytes;
}
