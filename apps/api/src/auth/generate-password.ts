import { randomInt } from "node:crypto";

/**
 * The alphabet a human has to read off a screen and type correctly, once, from a note.
 *
 * Deliberately excludes the pairs that get mistyped: `0/O/o`, `1/l/I`, `5/S`, `2/Z`. A
 * password that is rejected because the administrator read `l` as `1` costs a support round
 * trip, and the lost entropy is bought back by length instead.
 */
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRTUVWXY346789";

/** Grouped for reading aloud: `k7pQ-mR9t-Wx4n`. The dashes count toward length. */
const GROUP = 4;
const GROUPS = 3;

/**
 * A random initial password.
 *
 * `randomInt` is the CSPRNG, not `Math.random`. Rejection sampling inside `randomInt` means
 * no modulo bias, so every character is uniform over the alphabet — with 12 characters from
 * 51 symbols that is ~68 bits, far beyond anything reachable against a rate-limited login on
 * an internal network.
 *
 * Generated ONCE and returned to the caller. It is never stored, never logged, and cannot be
 * read back; the only copy is the response the administrator is looking at.
 */
export function generatePassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    for (let i = 0; i < GROUP; i++) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}
