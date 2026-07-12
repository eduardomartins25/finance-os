/**
 * Generates a cryptographically secure UUID v7.
 * UUID v7 is time-ordered, which ensures that IndexedDB can index records efficiently
 * by creation time and resolves concurrency sorting issues.
 */
export function uuidv7(): string {
  const now = Date.now();
  const timestampHex = now.toString(16).padStart(12, '0');

  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // 12 bits of random for rand_a, prefixed by version 7 (0x7000)
  const randA = ((randomBytes[0] << 8) | randomBytes[1]) & 0x0fff;
  const verAndRandA = (0x7000 | randA).toString(16).padStart(4, '0');

  // 62 bits of random for rand_b, prefixed by variant 2 (10xx, i.e., 0x80)
  const varByte = (randomBytes[2] & 0x3f) | 0x80;
  let randB = varByte.toString(16).padStart(2, '0');
  
  for (let i = 3; i < 10; i++) {
    randB += randomBytes[i].toString(16).padStart(2, '0');
  }

  const part1 = timestampHex.substring(0, 8);
  const part2 = timestampHex.substring(8, 12);
  const part3 = verAndRandA;
  const part4 = randB.substring(0, 4);
  const part5 = randB.substring(4, 16);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
