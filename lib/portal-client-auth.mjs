import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt =
  promisify(crypto.scrypt);

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export async function hashPortalPassword(password) {

  if (
    typeof password !== "string" ||
    password.length < 12
  ) {
    throw new Error(
      "Password must contain at least 12 characters."
    );
  }

  const salt =
    crypto.randomBytes(24);

  const derived =
    await scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N,
        r: R,
        p: P,
        maxmem: 64 * 1024 * 1024
      }
    );

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url")
  ].join("$");
}

export async function verifyPortalPassword(
  password,
  encoded
) {

  try {

    const [
      algorithm,
      n,
      r,
      p,
      saltEncoded,
      hashEncoded
    ] = String(encoded || "").split("$");

    if (algorithm !== "scrypt") {
      return false;
    }

    const salt =
      Buffer.from(
        saltEncoded,
        "base64url"
      );

    const expected =
      Buffer.from(
        hashEncoded,
        "base64url"
      );

    const derived =
      Buffer.from(
        await scrypt(
          String(password),
          salt,
          expected.length,
          {
            N: Number(n),
            r: Number(r),
            p: Number(p),
            maxmem:
              64 * 1024 * 1024
          }
        )
      );

    return (
      expected.length === derived.length &&
      crypto.timingSafeEqual(
        expected,
        derived
      )
    );

  } catch {
    return false;
  }
}

export function normalizeClientId(value) {

  return String(value || "")
    .trim()
    .toLowerCase();
}
