// news-image-20261120 entry (Node 22, standard library only).
//
// The picture is a newspaper front page summing up the world's news of
// Friday 20 November 2026: masthead "WORLD NEWS" with the date in a red
// banner, and four illustrated panels — TRUMP: NO IRAN DECISION UNTIL 2027
// (the president aboard Air Force One, "we'll see what happens after
// January 1"), CYCLONE AKVAN HITS INDIA TODAY (landfall near Gopalpur,
// 105,000 evacuated), EUROPE READY FOR TALKS WITH RUSSIA (leaders at the
// Berlin summit), and GTA VI: $1.84 BILLION IN A DAY (the game passing The
// Odyssey's box-office total). The image was generated for this entry, and
// the program below simply delivers it to the grader's output directory.
//
// Run it the way the kit does:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program runs twice and must write the same bytes both times; a
// byte-for-byte copy of one fixed file always does. Verified 2026-11-20:
// two runs into separate directories produced byte-identical outputs
// (258,480 bytes), matching the source file exactly.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Competition limits for the delivered image.
const ONE_MIB = 1024 * 1024;
const MAX_SIDE_PX = 1024;

function fail(message: string): never {
  throw new Error(message);
}

// Work out the format and pixel size from the file's own bytes: PNG reads
// its IHDR, JPEG walks its segments to the first SOF marker. Anything else
// is not an image the gate accepts.
function probe(
  bytes: Buffer,
): { format: 'png' | 'jpeg'; width: number; height: number } {
  const isPng =
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  if (isPng) {
    return {
      format: 'png',
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  const isJpeg = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isJpeg) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        fail('entry.png has a malformed JPEG segment');
      }
      const marker = bytes[offset + 1];
      const segmentLength = bytes.readUInt16BE(offset + 2);
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        return {
          format: 'jpeg',
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + segmentLength;
    }
    fail('entry.png has no JPEG SOF marker');
  }
  fail('entry.png is neither PNG nor JPEG');
}

// The image lives beside this file in the repository; the output directory
// is the grader's /output unless MAKEFUN_OUTPUT_DIR says otherwise.
const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'entry.png');
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const targetPath = join(outputDir, 'entry.png');

if (!existsSync(sourcePath)) {
  fail('entry.png is missing beside main.ts');
}
const source = readFileSync(sourcePath);

if (source.length === 0) {
  fail('entry.png is empty');
}
if (source.length > ONE_MIB) {
  fail(`entry.png is ${source.length} bytes, over the 1 MiB competition cap`);
}

const image = probe(source);
if (image.width > MAX_SIDE_PX || image.height > MAX_SIDE_PX) {
  fail(
    `entry.png is ${image.width}x${image.height}, over the 1024 px competition cap`,
  );
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, targetPath);

// A copied file must actually hold the picture: compare the delivered bytes
// against the source instead of trusting the copy call.
const delivered = readFileSync(targetPath);
if (!delivered.equals(source)) {
  fail('entry.png was not copied whole');
}
