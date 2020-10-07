import { css, injectGlobal } from "emotion";
import React from "react";
import ReactDOM from "react-dom";
import { ipcRenderer } from "electron";
import { useState } from "react";
import { createHash, randomBytes } from "crypto";
// @ts-ignore
import hyperswarm from "hyperswarm";
import cbor from "cbor";
import { Subject, useSubject } from "./lib/subject";

const colors = {
  background: "#282c34",
  backgroundDark: "#21252b",
  backgroundLight: "#2c313c",
  backgroundHover: "#292d35",
  backgroundFocus: "#2c313a",
  white: "#abb2bf",
  gray: "#5c6370",
  blue: "#61afef",
  red: "#e06c75",
  yellow: "#e5c07b",
  green: "#98c379",
};

const fonts = {
  sans: `Ubuntu, Arial, Helvetica, sans-serif`,
  mono: `Ubuntu Monospace, monospace`,
};

setTimeout(() => {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("root")
  );
}, 100);

injectGlobal`
  body {
    margin: 0;
  }
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap');
`;

function App() {
  const [text, setText] = useState("");
  const hashList = useSubject(hashListSubject);
  const connections = useSubject(connectionCountSubject);
  return (
    <div
      className={css`
        width: 100vw;
        height: 100vh;
        background-color: ${colors.background};
        color: ${colors.white};
        font-family: ${fonts.sans};
        font-weight: 400;
      `}
    >
      <div
        className={css`
          -webkit-app-region: drag;
          display: flex;
          justify-content: space-between;
          background-color: ${colors.backgroundDark};
        `}
      >
        <div
          onClick={() => {}}
          className={`${buttonStyle} ${css`
            -webkit-app-region: no-drag;
          `}`}
        >
          tabs
        </div>
        <input
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          spellCheck={false}
          placeholder="search"
          className={`${inputStyle} ${css`
            -webkit-app-region: no-drag;
            width: 600px;
          `}`}
        />
        <div
          onClick={() => {
            ipcRenderer.send("app:quit");
          }}
          className={`${buttonStyle} ${css`
            -webkit-app-region: no-drag;
          `}`}
        >
          exit
        </div>
      </div>
      <div>
        {Hash.isValidHex(text) && (
          <div>
            <div
              onClick={() => {
                addHash(Hash.fromHex(text));
                setText("");
              }}
              className={buttonStyle}
            >
              add
            </div>
          </div>
        )}
        <HashOfText />
        <div>connections: {connections}</div>
        <div>
          {hashList.map(({ hash, leech, seed, keep, data }) => {
            return (
              <div
                key={hash.byteString}
                className={css`
                  display: flex;
                  font-family: ${fonts.mono};
                `}
              >
                <div>{hash.hexString}</div>
                <div
                  onClick={() => {
                    leechHash(hash, !leech);
                  }}
                  className={toggleStyle(leech)}
                >
                  leech
                </div>
                <div
                  onClick={() => {
                    seedHash(hash, !seed);
                  }}
                  className={toggleStyle(seed)}
                >
                  seed
                </div>
                <div
                  onClick={() => {
                    keepHash(hash, !keep);
                  }}
                  className={toggleStyle(keep)}
                >
                  keep
                </div>
                <div>{data && data.toString()}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const buttonStyle = css`
  background-color: ${colors.backgroundDark};
  &:hover {
    background-color: ${colors.backgroundHover};
  }
  user-select: none;
  cursor: default;
  padding: 1px 8px;
`;

const inputStyle = css`
  background-color: ${colors.backgroundDark};
  border: 1px dashed ${colors.backgroundLight};
  outline: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  padding: 0 8px;
  margin: 0;
  &:focus {
    border: 1px dashed ${colors.blue};
  }
  word-wrap: pre;
`;

const toggleStyle = (isActive: boolean) =>
  isActive ? toggleStyleEnabled : toggleStyleDisabled;

const toggleStyleBase = css`
  cursor: default;
  user-select: none;
  padding: 1px 8px;
  &:hover {
    background-color: ${colors.backgroundFocus};
  }
`;

const toggleStyleEnabled = css`
  ${toggleStyleBase}
  color: ${colors.green};
`;

const toggleStyleDisabled = css`
  ${toggleStyleBase}
  color: ${colors.gray};
`;

function HashOfText() {
  const [text, setText] = useState("");
  const hash = Hash.fromDataString(text);
  return (
    <div>
      <div>{hash.hexString}</div>
      <div
        onClick={() => {
          addDataBuffer(Buffer.from(text));
          setText("");
        }}
        className={buttonStyle}
      >
        save
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        className={inputStyle}
      />
    </div>
  );
}

const hashListSubject = Subject<Array<HashInfo>>({ initial: [] });
const hashes: Map<string, HashInfo> = new Map();
type HashInfo = {
  hash: Hash;
  leech: boolean;
  seed: boolean;
  keep: boolean;
  data: Buffer | undefined;
};

function addHash(hash: Hash) {
  hashes.set(hash.byteString, {
    hash,
    leech: false,
    seed: false,
    keep: false,
    data: undefined,
  });
  hashListSubject.publish(Array.from(hashes.values()));
}

function leechHash(hash: Hash, leech: boolean) {
  const info = hashes.get(hash.byteString);
  if (info) {
    info.leech = leech;
    hashListSubject.publish(Array.from(hashes.values()));
  }
}

function seedHash(hash: Hash, seed: boolean) {
  const info = hashes.get(hash.byteString);
  if (info) {
    info.seed = seed;
    hashListSubject.publish(Array.from(hashes.values()));
  }
}

function keepHash(hash: Hash, keep: boolean) {
  const info = hashes.get(hash.byteString);
  if (info) {
    info.keep = keep;
    hashListSubject.publish(Array.from(hashes.values()));
  }
}

function addDataBuffer(data: Buffer) {
  const hash = Hash.fromDataBuffer(data);
  addHash(hash);
  const info = hashes.get(hash.byteString);
  if (info) {
    info.data = data;
  }
  hashListSubject.publish(Array.from(hashes.values()));
}

class Hash {
  static type = "sha256";
  static bytes = 32;
  buffer: Buffer;
  byteString: string;
  hexString: string;
  private constructor(buffer: Buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error();
    if (buffer.length !== 32) throw new Error();
    this.buffer = buffer;
    this.byteString = buffer.toString("utf8");
    this.hexString = buffer.toString("hex");
  }
  static fromHex(text: string) {
    const buffer = Buffer.from(text, "hex");
    return new Hash(buffer);
  }
  static fromBuffer(buffer: Buffer) {
    return new Hash(buffer);
  }
  static isValidHex(text: string) {
    return Buffer.from(text, "hex").length === this.bytes;
  }
  static fromDataBuffer(data: Buffer) {
    return new Hash(Buffer.from(createHash("sha256").update(data).digest()));
  }
  static fromDataString(data: string) {
    return new Hash(Buffer.from(createHash("sha256").update(data).digest()));
  }
}

const connectionCountSubject = Subject({ initial: 0 });

const myNodeId = Buffer.from(randomBytes(32));
const swarm = hyperswarm();
swarm.join(Hash.fromDataString("p2p-network-tools-file-sharing").buffer, {
  lookup: true,
  announce: true,
});
swarm.on("connection", (socket: any, info: any) => {
  console.log("connection");
  connectionCountSubject.publish(connectionCountSubject.value + 1);
  const clean = () => {
    connectionCountSubject.publish(connectionCountSubject.value - 1);
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
      remoteState.set(Hash.fromBuffer(hash).byteString, state);
    },
  });
  decoder.on("data", reaction);
  encoder.write(protocolCbor.serialize.node({ id: myNodeId }));
  const remoteState = new Map<string, HashSyncState | undefined>();
  const syncState = new Map<string, HashSyncState | undefined>();
  const intervalId = setInterval(() => {
    for (const hashInfo of hashes.values()) {
      const hashSyncState = getHashSyncState(hashInfo);
      if (hashSyncState !== syncState.get(hashInfo.hash.byteString)) {
        encoder.write(
          protocolCbor.serialize.hash({
            hash: hashInfo.hash.buffer,
            state: hashSyncState,
          })
        );
        syncState.set(hashInfo.hash.byteString, hashSyncState);
      }
    }
    console.log(remoteState);
  }, 100);
});

type HashSyncState = "disinterested" | "interested" | "providing";
function getHashSyncState({ leech, seed, data }: HashInfo): HashSyncState {
  if (seed && data) return "providing";
  if (leech && !data) return "interested";
  return "disinterested";
}

type Protocol = {
  node: { id: Buffer };
  hash: { hash: Buffer; state: HashSyncState };
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
