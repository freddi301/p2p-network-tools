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
server.listen(port);

export type API = typeof api;
const api = {
  async getAllHashInfo() {
    return Array.from(repo.values(), ({ hash, size }) => ({
      hash,
      size,
    }));
  },
  async getBlockOfHash(hash: Buffer) {
    const block = repo.get(hash.toString())?.block;
    console.log(
      "get block of hash",
      hash.toString("hex"),
      block?.length,
      block?.toString()
    );
    return block;
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
    repo.set(hash.toString(), { hash, block, size: block.length });
    console.log(
      "add block",
      hash.toString("hex"),
      block.length,
      block.toString()
    );
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
  | { hash: Buffer; block?: undefined; size?: undefined }
  | { hash: Buffer; block: Buffer; size: number }
>();

function hashFromBlock(block: Buffer) {
  return crypto.createHash("sha256").update(block).digest();
}

const swarm = hyperswarm({ queue: { multiplex: true } });
swarm.on("connection", (socket: any, info: any) => {
  infos.add(info);
});
swarm.on("disconnection", (socket: any, info: any) => {
  infos.delete(info);
});

const infos = new Set<any>();
