import { createHash } from "crypto";
import { HashStaticInterface, HashInterface } from "../apiInterface";

export const sha256: HashStaticInterface<SHA256> = {
  isValidHex(text: string) {
    return Buffer.from(text, "hex").length === 32;
  },
  fromHex(text: string) {
    const buffer = Buffer.from(text, "hex");
    return new SHA256(buffer);
  },
  isValidBuffer(buffer: Buffer) {
    return buffer.length === 32;
  },
  fromBuffer(buffer: Buffer) {
    return new SHA256(Buffer.from(buffer));
  },
  fromDataString(data: string) {
    return new SHA256(Buffer.from(createHash("sha256").update(data).digest()));
  },
  fromDataBuffer(data: Buffer) {
    return new SHA256(Buffer.from(createHash("sha256").update(data).digest()));
  },
};

class SHA256 implements HashInterface {
  asBuffer: Buffer;
  asRawString: string;
  asHexString: string;
  constructor(buffer: Buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error("invalid buffer");
    if (buffer.length !== 32) throw new Error("invalid buffer length");
    this.asBuffer = buffer;
    this.asRawString = buffer.toString("utf8");
    this.asHexString = buffer.toString("hex");
  }
}
