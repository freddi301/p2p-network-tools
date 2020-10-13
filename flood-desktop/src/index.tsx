import React, { useMemo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { css, injectGlobal } from "emotion";
import { ipcRenderer } from "electron";
// @ts-ignore
import hyperswarm from "hyperswarm";
import { createHash, randomBytes } from "crypto";
import cbor from "cbor";
import levelup from "levelup";
import leveldown from "leveldown";

setTimeout(() => {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("root")
  );
}, 0);

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

injectGlobal`
  body {
    margin: 0;
    background-color: ${colors.background};
    color: ${colors.white};
    font-family: ${fonts.sans};
  }
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap');
`;

function App() {
  return (
    <div>
      <div
        className={css`
          background-color: ${colors.backgroundDark};
          -webkit-app-region: drag;
        `}
      >
        <button
          onClick={() => {
            ipcRenderer.send("app:quit");
          }}
          className={css`
            -webkit-app-region: no-drag;
          `}
        >
          exit
        </button>
      </div>
      <Chat />
    </div>
  );
}

const blocks = new Map<string, { hash: Buffer; data: Buffer }>();
const blocksSubscribers = new Set<BlocksSubscriber>();
type BlocksSubscriber = (hash: Buffer, data: Buffer) => void;
function subscribeBlocks(subscriber: BlocksSubscriber) {
  for (const { hash, data } of blocks.values()) {
    subscriber(hash, data);
  }
  blocksSubscribers.add(subscriber);
}
function unsubscribeBlocks(subscriber: BlocksSubscriber) {
  blocksSubscribers.delete(subscriber);
}
function addStringBlock(data: string) {
  addBufferBlock(Buffer.from(data));
}
function addBufferBlock(data: Buffer) {
  const hash = hashBufferFromDataBuffer(data);
  if (!blocks.has(hash.toString())) {
    blocks.set(hash.toString(), { hash, data });
    for (const subscriber of blocksSubscribers) {
      subscriber(hash, data);
    }
  }
}

function hashBufferFromDataString(data: string) {
  return Buffer.from(createHash("sha256").update(data).digest());
}
function hashBufferFromDataBuffer(data: Buffer) {
  return Buffer.from(createHash("sha256").update(data).digest());
}

const swarm = hyperswarm();
swarm.network.bind();
swarm.join(hashBufferFromDataString("flood-desktop"), {
  lookoup: true,
  announce: true,
});
const myDeduplicationId = randomBytes(32);
let nextConnectionId = 1;
swarm.on("connection", (socket: any, info: any) => {
  const connectionId = nextConnectionId++;
  console.log(`connection ${connectionId}`);
  const encoder = new cbor.Encoder();
  encoder.pipe(socket);
  const decoder = new cbor.Decoder();
  socket.pipe(decoder);
  let otherDeduplicationId: null | Buffer = null;
  encoder.write({
    type: "deduplicationId",
    deduplicationId: myDeduplicationId,
  });
  decoder.on("data", (message) => {
    if (
      !otherDeduplicationId &&
      message.type === "deduplicationId" &&
      Buffer.isBuffer(message.deduplicationId) &&
      message.deduplicationId.length === 32
    ) {
      otherDeduplicationId = message.deduplicationId;
      const dropped = info.deduplicate(myDeduplicationId, otherDeduplicationId);
      if (dropped) {
        console.log(`connection ${connectionId} deduplicated`);
      }
      subscribeBlocks(propagate);
    } else {
      switch (message.type) {
        case "block": {
          addBufferBlock(message.data);
          break;
        }
        default: {
          console.log("invalid message");
          socket.end();
        }
      }
    }
  });
  const propagate: BlocksSubscriber = (hash, data) => {
    encoder.write({ type: "block", data });
  };
  socket.on("error", (error: unknown) => {
    console.log(`connection ${connectionId} error`);
    console.error(error);
    unsubscribeBlocks(propagate);
  });
  socket.on("close", () => {
    console.log(`connection ${connectionId} closed`);
    unsubscribeBlocks(propagate);
  });
});

const db = levelup(leveldown(process.env.FLOOD_DB || "./flood-db"));
subscribeBlocks((hash, data) => {
  db.put(hash, data);
});
db.createReadStream().on("data", function (data) {
  addBufferBlock(data.value);
});

function Chat() {
  type Message = {
    id: string;
    sender: string;
    recipient: string;
    text: string;
    creationTimestamp: number;
  };
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Record<string, Message>>({});
  const conversation = useMemo(() => {
    return Object.values(messages).sort(
      (a, b) => a.creationTimestamp - b.creationTimestamp
    );
  }, [messages]);
  useEffect(() => {
    const update = (hash: Buffer, data: Buffer) => {
      try {
        const id = hash.toString();
        const json = JSON.parse(data.toString());
        if (
          ((json.sender === recipient && json.recipient === sender) ||
            (json.sender === sender && json.recipient === recipient)) &&
          typeof json.text === "string" &&
          Number.isInteger(json.creationTimestamp)
        ) {
          setMessages((messages) => ({
            ...messages,
            [id]: {
              id,
              sender: json.sender,
              recipient: json.recipient,
              text: json.text,
              creationTimestamp: json.creationTimestamp,
            },
          }));
        }
      } catch (error) {}
    };
    subscribeBlocks(update);
    return () => {
      unsubscribeBlocks(update);
    };
  }, [sender, recipient]);
  const send = (text: string) => {
    addStringBlock(
      JSON.stringify({
        sender,
        recipient,
        text,
        creationTimestamp: Date.now(),
      })
    );
  };
  return (
    <div>
      <div>
        from{" "}
        <input
          value={sender}
          onChange={(event) => setSender(event.currentTarget.value)}
        />
      </div>
      <div>
        to{" "}
        <input
          value={recipient}
          onChange={(event) => setRecipient(event.currentTarget.value)}
        />
      </div>
      <div>
        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.currentTarget.value)}
        />
        <button
          onClick={() => {
            send(messageText);
            setMessageText("");
          }}
        >
          send
        </button>
      </div>
      {conversation.map((message) => {
        const displayName = message.sender === sender ? sender : recipient;
        return (
          <div key={message.id}>
            {displayName}: {message.text}
          </div>
        );
      })}
    </div>
  );
}
