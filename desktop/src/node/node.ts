import { randomBytes } from "crypto";
// @ts-ignore
import hyperswarm from "hyperswarm";
import cbor from "cbor";
import { Subject } from "../lib/subject";
import {
  Api,
  HashStaticInterface,
  HashInfo,
  HashInterface,
} from "../apiInterface";

export function startNode<Hash extends HashInterface>(
  hashI: HashStaticInterface<Hash>
) {
  const hashes: Map<string, HashInfo<Hash>> = new Map();
  const connections = new Map<
    number,
    {
      outState: Map<string, HashSyncState | undefined>;
      inState: Map<string, HashSyncState | undefined>;
    }
  >();
  function getOrCreateHash(hash: Hash) {
    const existing = hashes.get(hash.asRawString);
    if (existing) {
      return existing;
    } else {
      const created = {
        hash,
        leech: false,
        seed: false,
        keep: false,
        lookup: false,
        announce: false,
        data: undefined,
        askedOnConnection: undefined,
      };
      hashes.set(hash.asRawString, created);
      return created;
    }
  }
  function getHash(hash: Hash) {
    return hashes.get(hash.asRawString);
  }
  const hashListSubject = Subject<Array<HashInfo<Hash>>>({ initial: [] });
  const connectionCount = Subject({ initial: 0 });
  const api: Api<Hash> = {
    connectionCount,
    hashListSubject,
    hash: hashI,
    updateHash(hash, params) {
      Object.assign(getOrCreateHash(hash), params);
      notifyHashList();
    },
    addDataString(data: string) {
      const hash = hashI.fromDataString(data);
      getOrCreateHash(hash).data = Buffer.from(data);
      notifyHashList();
    },
    addDataBuffer(data: Buffer) {
      const hash = hashI.fromDataBuffer(data);
      getOrCreateHash(hash).data = data;
      notifyHashList();
    },
  };
  function notifyHashList() {
    hashListSubject.publish(Array.from(hashes.values()));
  }

  const myNodeId = Buffer.from(randomBytes(32));
  let nextConnectionId = 1;
  const swarm = hyperswarm({ queue: { multiplex: true } });
  // must be called manually, otherwise no peer are found
  swarm.network.bind(() => {
    console.log("bound");
  });
  swarm.on("peer", (peer: any) => {
    console.log("peer", peer);
  });
  swarm.on("peer-rejected", (peer: any) => {
    console.log("peer-rejected", peer);
  });
  swarm.on("update", (info: any) => {
    console.log("update", info);
  });
  swarm.on("connection", (socket: any, info: any) => {
    console.log("connection");
    const connectionId = nextConnectionId++;
    const inState = new Map<string, HashSyncState | undefined>();
    const outState = new Map<string, HashSyncState | undefined>();
    connections.set(connectionId, { inState, outState });
    connectionCount.publish(connections.size);
    const clean = () => {
      connections.delete(connectionId);
      connectionCount.publish(connections.size);
      clearInterval(intervalId);
    };
    socket.on("error", (error: unknown) => {
      console.log("connection closed");
      console.error(error);
      clean();
    });
    socket.on("close", () => {
      console.log("connection closed");
      clean();
    });
    const encoder = new cbor.Encoder();
    encoder.pipe(socket);
    const decoder = new cbor.Decoder();
    socket.pipe(decoder);
    let otherId: null | Buffer = null;
    const reaction = protocolCbor.deserialize({
      node({ id }) {
        if (otherId) {
          socket.end();
          console.log("invalid message");
        } else {
          otherId = id;
          const dropped = info.deduplicate(myNodeId, id);
          if (dropped) {
            console.log("deduplicated");
          }
        }
      },
      hash({ hash, state }) {
        if (!otherId) {
          socket.end();
          console.log("invalid message");
          return;
        }
        inState.set(hashI.fromBuffer(hash).asRawString, state);
      },
      data({ data }) {
        const hash = hashI.fromDataBuffer(data);
        const existing = getHash(hash);
        if (existing) {
          existing.data = data;
          notifyHashList();
        }
      },
      request({ hash }) {
        const i = getHash(hashI.fromBuffer(hash));
        if (i && i.data && i.seed) {
          encoder.write(protocolCbor.serialize.data({ data: i.data }));
        }
      },
    });
    decoder.on("data", reaction);
    encoder.write(protocolCbor.serialize.node({ id: myNodeId }));
    const intervalId = setInterval(() => {
      for (const hashInfo of hashes.values()) {
        const hashSyncState = getHashSyncState(hashInfo);
        if (hashSyncState !== outState.get(hashInfo.hash.asRawString)) {
          encoder.write(
            protocolCbor.serialize.hash({
              hash: hashInfo.hash.asBuffer,
              state: hashSyncState,
            })
          );
          outState.set(hashInfo.hash.asRawString, hashSyncState);
        }
        if (
          hashInfo.leech &&
          inState.get(hashInfo.hash.asRawString) === "providing"
        ) {
          encoder.write(
            protocolCbor.serialize.request({
              hash: hashInfo.hash.asBuffer,
            })
          );
        }
      }
    }, 100);
  });
  setInterval(() => {
    for (const hashInfo of hashes.values()) {
      updateTopicStatus(hashInfo.hash, hashInfo);
      // console.log(swarm.status(hashI.toBuffer(hashInfo.hash)));
    }
  }, 100);
  function updateTopicStatus(
    hash: Hash,
    { lookup, announce }: { lookup: boolean; announce: boolean }
  ) {
    const shouldLeave = lookup === false && announce === false;
    const topicStatus = swarm.status(hash.asBuffer);
    if (shouldLeave) {
      if (topicStatus) {
        swarm.leave(hash.asBuffer);
        console.log("leaving", hash.asHexString, hash.asBuffer);
      }
    } else {
      if (topicStatus) {
        if (
          topicStatus.lookup !== lookup ||
          topicStatus.announce !== announce
        ) {
          swarm.join(hash.asBuffer, { lookup, announce });
          console.log(
            "joining",
            hash.asHexString,
            { lookup, announce },
            hash.asBuffer
          );
        }
      } else {
        swarm.join(hash.asBuffer, { lookup, announce });
        console.log(
          "joining",
          hash.asHexString,
          { lookup, announce },
          hash.asBuffer
        );
      }
    }
  }
  return api;
}

type HashSyncState = "disinterested" | "interested" | "providing";
function getHashSyncState<Hash>({
  leech,
  seed,
  data,
}: HashInfo<Hash>): HashSyncState {
  if (seed && data) return "providing";
  if (leech && !data) return "interested";
  return "disinterested";
}

type Protocol = {
  node: { id: Buffer };
  hash: { hash: Buffer; state: HashSyncState };
  data: { data: Buffer };
  request: { hash: Buffer };
};
type ProtocolImplementation<S> = {
  serialize: { [K in keyof Protocol]: (arg: Protocol[K]) => S };
  deserialize: (
    cases: { [K in keyof Protocol]: (arg: Protocol[K]) => void }
  ) => (serialiazed: S) => void;
};

const constrain = function <C>(): <T extends C>(value: T) => T {
  return (value) => value;
};
const protocolCborType = constrain<{ [K in keyof Protocol]: string }>()({
  node: "node",
  hash: "hash",
  data: "data",
  request: "request",
} as const);
const protocolCbor: ProtocolImplementation<
  {
    [K in keyof Protocol]: { type: typeof protocolCborType[K] } & Protocol[K];
  }[keyof Protocol]
> = {
  serialize: Object.fromEntries(
    Object.entries(protocolCborType).map(([method, type]) => [
      method,
      (args: any) => ({ ...args, type }),
    ])
  ) as any,
  deserialize(cases) {
    return (message) => (cases[message.type] as any)(message);
  },
};
