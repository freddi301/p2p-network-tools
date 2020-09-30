import crypto from "crypto";

export type Hash = Buffer;

export type Protocol =
  | {
      type: "do you have block of hash";
      hash: Buffer;
    }
  | {
      type: "give me block of hash";
      hash: Buffer;
    }
  | {
      type: "i do have block of hash";
      hash: Buffer;
    }
  | {
      type: "i give you block of hash";
      block: Buffer;
    };

export function hashFromBlock(block: Buffer) {
  return Buffer.from(crypto.createHash("sha256").update(block).digest());
}
