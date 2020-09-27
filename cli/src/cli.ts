// @ts-ignore
import hyperswarm from "hyperswarm";
import CBOR from "cbor";
import { Protocol, hashFromBlock } from "./protocol";

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
              process.stdout.write(block, () => {
                process.stdout.end();
              });
              socket.end();
              swarm.leave(hash, () => {
                swarm.destroy();
                // swarm.on("close", () => {
                // });
              });
            }
            break;
          }
        }
      });
    });
    break;
  }
  case "seed": {
    streamToBuffer(process.stdin).then((block) => {
      const hash = hashFromBlock(block);
      console.log(`seeding a block`);
      console.log(`of size ${block.length} bytes`);
      console.log(`with hash ${hash.toString("hex")}`);
      console.log(`ctrl+c to stop seeding`);
      const swarm = hyperswarm();
      swarm.join(hash, {
        lookup: false,
        announce: true,
      });
      swarm.on("connection", (socket: any, info: any) => {
        console.log("connection");
        const decoder = new CBOR.Decoder();
        socket.pipe(decoder);
        const encoder = new CBOR.Encoder();
        encoder.pipe(socket);
        decoder.on("data", (message: Protocol) => {
          switch (message.type) {
            case "do you have block of hash": {
              if (hash.equals(message.hash)) {
                encoder.write({
                  type: "i do have block of hash",
                  hash,
                } as Protocol);
              }
              break;
            }
            case "give me block of hash": {
              if (hash.equals(message.hash)) {
                encoder.write({
                  type: "i give you block of hash",
                  block,
                } as Protocol);
              }
            }
          }
        });
        socket.on("error", (error: any) => {
          console.log("connection closed due to error", error);
        });
        socket.on("close", () => {
          console.log("connection closed");
        });
      });
    });
    break;
  }
  default:
    throw new Error("bad command");
}

function streamToBuffer(stream: NodeJS.ReadStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Array<Buffer> = [];
    stream.on("data", (data) => buffers.push(data));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
    stream.on("error", (error) => reject(error));
  });
}
