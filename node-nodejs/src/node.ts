// @ts-ignore
import hyperswarm from "hyperswarm";
import CBOR from "cbor";
import { makeReferenceCountedMap } from "./lib/referenceCountedMap";
import { makePromiseable } from "./lib/promiseable";
import { Protocol, Hash, hashFromBlock } from "./protocol";

export function start() {
  const hashes = makeReferenceCountedMap({
    keyMapper(hash: Hash) {
      return hash.toString();
    },
    valueFactory(hash) {
      const blockPromiseable = makePromiseable<Buffer>();
      blockPromiseable.subscribe(() => {
        updateTopicStatus(hash, { lookup: false, announce: true });
      });
      return {
        hash,
        blockPromiseable: blockPromiseable,
        get block() {
          return blockPromiseable.state.type === "resolved"
            ? blockPromiseable.state.value
            : undefined;
        },
      };
    },
    onAdd(hash) {
      updateTopicStatus(hash, { lookup: true, announce: false });
    },
    onRemove(hash) {
      updateTopicStatus(hash, { lookup: false, announce: false });
    },
  });

  function subscribeBlock(hash: Hash, onBlock: (block: Buffer) => void) {
    const {
      value: { blockPromiseable },
      release,
    } = hashes.acquire(hash);
    blockPromiseable.subscribe(onBlock);
    return {
      unsubscribe() {
        release();
      },
    };
  }

  function provideBlock(block: Buffer) {
    const hash = hashFromBlock(block);
    const blockPromiseable = hashes.get(hash)?.blockPromiseable;
    if (blockPromiseable?.state.type === "unresolved") {
      blockPromiseable.resolve(block);
    }
  }

  // (window as any).provideBlock = provideBlock;

  const swarm = hyperswarm({ queue: { multiplex: true } });

  let nextConnectionId = 1;
  const connections = new Map<number, {}>();
  swarm.on("connection", (socket: any, info: any) => {
    const connectionId = nextConnectionId++;
    // console.log("connection", connectionId);
    const decoder = new CBOR.Decoder();
    socket.pipe(decoder);
    const encoder = new CBOR.Encoder();
    encoder.pipe(socket);
    socket.on("error", (error: unknown) => {
      // console.log("connection closed due to error", error);
      connections.delete(connectionId);
    });
    socket.on("close", () => {
      // console.log("connection closed");
      connections.delete(connectionId);
    });
    setInterval(() => {
      for (const [, { hash, block }] of hashes.entries) {
        if (!block) {
          send({ type: "do you have block of hash", hash });
        }
      }
    }, 500);
    const send = (message: Protocol) => {
      encoder.write(message);
    };
    connections.set(connectionId, {});
    decoder.on("data", (message: Protocol) => {
      switch (message.type) {
        case "do you have block of hash": {
          const hashEntry = hashes.get(message.hash);
          if (hashEntry?.block) {
            send({
              type: "i do have block of hash",
              hash: hashEntry.hash,
            });
          }
          break;
        }
        case "give me block of hash": {
          const hashEntry = hashes.get(message.hash);
          if (hashEntry?.block) {
            send({
              type: "i give you block of hash",
              block: hashEntry.block,
            });
          }
          break;
        }
        case "i do have block of hash": {
          const hashEntry = hashes.get(message.hash);
          if (hashEntry) {
            send({
              type: "give me block of hash",
              hash: hashEntry.hash,
            });
          }
          break;
        }
        case "i give you block of hash": {
          provideBlock(message.block);
          break;
        }
      }
    });
  });

  function updateTopicStatus(
    hash: Hash,
    { lookup, announce }: { lookup: boolean; announce: boolean }
  ) {
    const shouldLeave = lookup === false && announce === false;
    const topicStatus = swarm.status(hash);
    if (shouldLeave) {
      if (topicStatus) swarm.leave(hash);
    } else {
      if (topicStatus) {
        if (
          topicStatus.lookup !== lookup ||
          topicStatus.announce !== announce
        ) {
          swarm.join(hash, { lookup, announce });
        }
      } else {
        swarm.join(hash, { lookup, announce });
      }
    }
  }

  return { subscribeBlock, provideBlock };
}
