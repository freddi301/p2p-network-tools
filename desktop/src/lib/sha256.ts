import { createHash } from "crypto";
import { HashStaticInterface } from "../apiInterface";

export const sha256: HashStaticInterface<SHA256> = {
  isValidHex(text: string) {
    return Buffer.from(text, "hex").length === 32;
  },
  fromHex(text: string) {
    const buffer = Buffer.from(text, "hex");
    return new SHA256(buffer);
  },
  toHex(hash: SHA256) {
    return hash.hexString;
  },
  isValidBuffer(buffer: Buffer) {
    return buffer.length === 32;
  },
  fromBuffer(buffer: Buffer) {
    return new SHA256(Buffer.from(buffer));
  },
  toBuffer(hash: SHA256) {
    return hash.buffer;
  },
  fromDataString(data: string) {
    return new SHA256(Buffer.from(createHash("sha256").update(data).digest()));
  },
  fromDataBuffer(data: Buffer) {
    return new SHA256(Buffer.from(createHash("sha256").update(data).digest()));
  },
  toRawString(hash: SHA256) {
    return hash.byteString;
  },
};

class SHA256 {
  buffer: Buffer;
  byteString: string;
  hexString: string;
  constructor(buffer: Buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error("invalid buffer");
    if (buffer.length !== 32) throw new Error("invalid buffer length");
    this.buffer = buffer;
    this.byteString = buffer.toString("utf8");
    this.hexString = buffer.toString("hex");
  }
}
