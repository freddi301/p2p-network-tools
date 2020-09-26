// @ts-ignore
import hyperswarm from "hyperswarm";
import CBOR from "cbor";
import crypto from "crypto";

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
  return crypto.createHash("sha256").update(block).digest();
}

const [, , command, ...params] = process.argv;

switch (command) {
  case "leech": {
    const [hashHex] = params;
    const hash = Buffer.from(hashHex, "hex");
    if (hash.length !== 32) throw new Error("bad hash");
    const swarm = hyperswarm();
    swarm.join(hash, {
      lookup: true,
      announce: false,
    });
    swarm.on("connection", (socket: any, info: any) => {
      const decoder = new CBOR.Decoder();
      socket.pipe(decoder);
      const encoder = new CBOR.Encoder();
      encoder.pipe(socket);
      encoder.write({
        type: "do you have block of hash",
        hash,
      } as Protocol);
      decoder.on("data", (message: Protocol) => {
        switch (message.type) {
          case "i do have block of hash": {
            if (hash.equals(message.hash)) {
              encoder.write({
                type: "give me block of hash",
                hash,
              } as Protocol);
            }
            break;
          }
          case "i give you block of hash": {
            const { block } = message;
            if (hash.equals(hashFromBlock(block))) {
              process.stdout.write(block, (error) => {
                swarm.leave(hash, () => {
                  process.stdout.end(() => {
                    process.exit(0);
                  });
                });
              });
            }
            break;
          }
        }
      });
    });
    break;
  }
  default:
    throw new Error("bad command");
}
