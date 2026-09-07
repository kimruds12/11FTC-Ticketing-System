import { describe, it, expect, beforeAll } from "vitest";
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  createLocalJWKSet,
  type JWK,
} from "jose";
import { TokenVerifier } from "./token-verifier.js";

/**
 * Verifier unit tests. We stand up a LOCAL ES256 keypair and feed its public half to
 * `createLocalJWKSet`, so `TokenVerifier` can be exercised exactly as in production
 * (jwtVerify against a JWKS) without touching Supabase. This is the M1 signature/claim gate;
 * the 401/403 HTTP mapping is tested at the guard level (auth.guard.spec.ts).
 */
const ISSUER = "https://proj.supabase.co/auth/v1";
const AUDIENCE = "authenticated";
const KID = "test-key-1";
const SUB = "11111111-1111-1111-1111-111111111111";

let signKey: CryptoKey; // private key whose public half IS in the JWKS
let forgedKey: CryptoKey; // a different key NOT in the JWKS
let verifier: TokenVerifier;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  signKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  const publicJwk: JWK = { ...jwk, kid: KID, alg: "ES256", use: "sig" };

  const forged = await generateKeyPair("ES256", { extractable: true });
  forgedKey = forged.privateKey;

  const jwks = createLocalJWKSet({ keys: [publicJwk] });
  verifier = new TokenVerifier(jwks, { issuer: ISSUER, audience: AUDIENCE });
});

interface SignOpts {
  key?: CryptoKey;
  kid?: string;
  issuer?: string;
  audience?: string;
  expiration?: string | number; // jose setExpirationTime (epoch seconds for past times)
  sub?: string | null;
  includeEmail?: boolean;
}

async function sign(opts: SignOpts = {}): Promise<string> {
  const {
    key = signKey,
    kid = KID,
    issuer = ISSUER,
    audience = AUDIENCE,
    expiration = "1h",
    sub = SUB,
    includeEmail = true,
  } = opts;

  const claims: Record<string, unknown> = { role: "authenticated" };
  if (includeEmail) claims.email = "staff@company.com";

  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(expiration);
  if (sub !== null) jwt.setSubject(sub);
  return jwt.sign(key);
}

describe("TokenVerifier", () => {
  it("accepts a valid token and returns sub + email", async () => {
    const identity = await verifier.verify(await sign());
    expect(identity).toEqual({ sub: SUB, email: "staff@company.com" });
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    await expect(verifier.verify(await sign({ expiration: past }))).rejects.toThrow();
  });

  it("rejects a forged signature (signed by a key not in the JWKS)", async () => {
    await expect(verifier.verify(await sign({ key: forgedKey }))).rejects.toThrow();
  });

  it("rejects the wrong issuer", async () => {
    const t = await sign({ issuer: "https://evil.example.com/auth/v1" });
    await expect(verifier.verify(t)).rejects.toThrow();
  });

  it("rejects the wrong audience", async () => {
    await expect(verifier.verify(await sign({ audience: "anon" }))).rejects.toThrow();
  });

  it("rejects a validly-signed token missing the email claim", async () => {
    await expect(verifier.verify(await sign({ includeEmail: false }))).rejects.toThrow();
  });

  it("rejects a validly-signed token missing the sub claim", async () => {
    await expect(verifier.verify(await sign({ sub: null }))).rejects.toThrow();
  });

  it("rejects a structurally invalid token", async () => {
    await expect(verifier.verify("not.a.jwt")).rejects.toThrow();
  });
});
