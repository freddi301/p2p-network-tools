import CBOR from "cbor";
import WebSocket from "ws";
import http from "http";
import crypto from "crypto";
// @ts-ignore
import hyperswarm from "hyperswarm";

const port = process.env.PORT || 8086;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const { id, method, params } = CBOR.decode(message as Buffer);
    // @ts-ignore
    api[method](...params).then((result) => {
      ws.send(CBOR.encode({ id, result }));
    });
  });
});
server.listen(port, () => {
  console.log(`localhost:${port}`);
});

export type API = typeof api;
const api = {
  async getAll() {
    return Array.from(repo.values(), ({ hash, block }) => ({
      hash,
      size: block?.length,
      block,
    }));
  },
  async addHash(hash: Buffer) {
    if (!repo.has(hash.toString())) {
      repo.set(hash.toString(), { hash });
      swarm.join(hash, {
        lookup: true,
        announce: false,
      });
    }
  },
  async addBlock(block: Buffer) {
    const hash = hashFromBlock(block);
    repo.set(hash.toString(), { hash, block });
    swarm.join(hash, {
      lookup: false,
      announce: true,
    });
  },
  async getConnections() {
    return Array.from(infos, ({ type, topics, client, peer }) => ({
      type,
      topics,
      client,
      peer,
    }));
  },
};

const repo = new Map<
  string,
  { hash: Buffer; block?: undefined } | { hash: Buffer; block: Buffer }
>();

function hashFromBlock(block: Buffer) {
  return crypto.createHash("sha256").update(block).digest();
}

const swarm = hyperswarm({ queue: { multiplex: true } });
swarm.on("connection", (socket: any, info: any) => {
  infos.add(info);
  const decoder = new CBOR.Decoder();
  socket.pipe(decoder);
  const encoder = new CBOR.Encoder();
  encoder.pipe(socket);
  decoder.on("data", (message: Protocol) => {
    switch (message.type) {
      case "do you have block of hash": {
        const { hash } = message;
        const block = repo.get(hash.toString())?.block;
        if (block) {
          encoder.write({
            type: "i do have block of hash",
            hash,
            block,
          } as Protocol);
        } else {
          encoder.write({
            type: "i do not have block of hash",
            hash,
          } as Protocol);
        }
        break;
      }
      case "give me block of hash": {
        const { hash } = message;
        const block = repo.get(hash.toString())?.block;
        if (block) {
          encoder.write({
            type: "i give you block of hash",
            hash,
            block,
          } as Protocol);
        } else {
          encoder.write({
            type: "i do not have block of hash",
            hash,
          } as Protocol);
        }
        break;
      }
      case "i do have block of hash": {
        const { hash } = message;
        const entry = repo.get(hash.toString());
        const block = entry?.block;
        if (entry && !block) {
          encoder.write({
            type: "give me block of hash",
            hash,
          } as Protocol);
        }
        break;
      }
      case "i give you block of hash": {
        const { block } = message;
        const hash = hashFromBlock(block);
        const entry = repo.get(hash.toString());
        if (entry && !entry.block) {
          repo.set(hash.toString(), { hash, block });
        }
        break;
      }
    }
  });
  const lookupIntervalId = setTimeout(() => {
    for (const { hash, block } of repo.values()) {
      if (!block) {
        encoder.write({
          type: "do you have block of hash",
          hash,
        } as Protocol);
      }
    }
  }, 10 * 1000);
  decoder.on("close", () => {
    clearTimeout(lookupIntervalId);
  });
});
swarm.on("disconnection", (socket: any, info: any) => {
  infos.delete(info);
});

const infos = new Set<any>();

type Protocol = Query | Response;

type Query =
  | {
      type: "do you have block of hash";
      hash: Buffer;
    }
  | {
      type: "give me block of hash";
      hash: Buffer;
    };

type Response =
  | {
      type: "i do have block of hash";
      hash: Buffer;
    }
  | {
      type: "i do not have block of hash";
      hash: Buffer;
    }
  | {
      type: "i give you block of hash";
      block: Buffer;
    };
