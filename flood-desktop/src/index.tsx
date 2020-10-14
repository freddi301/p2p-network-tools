import React, { useMemo, useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { css, injectGlobal } from "emotion";
import { ipcRenderer, webFrame } from "electron";
// @ts-ignore
import hyperswarm from "hyperswarm";
import { createHash, randomBytes } from "crypto";
import cbor from "cbor";
import levelup from "levelup";
import leveldown from "leveldown";
import { useLayoutEffect } from "react";

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

const db = levelup(leveldown(process.env.FLOOD_DB || "./flood-db"));
subscribeBlocks((hash, data) => {
  db.put(hash, data);
});
db.createReadStream().on("data", function (data) {
  addBufferBlock(data.value);
});

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

webFrame.setZoomFactor(1);

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
    @import url("https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500&display=swap");
    @import url("https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap");
  }
  ::-webkit-scrollbar {
    width: 16px;
    height: 16px;
  }
  ::-webkit-scrollbar-thumb {
    min-height: 40px;
  }
  ::-webkit-scrollbar-track, ::-webkit-scrollbar-thumb {
    border: 4px solid transparent;
    background-clip: padding-box;
    border-radius: 8px;
  }
`;

const scrollStyleLight = css`
  &:hover::-webkit-scrollbar-track {
    background-color: ${colors.backgroundDark};
  }
  &:hover::-webkit-scrollbar-thumb {
    background-color: ${colors.blue};
  }
`;

const scrollStyleDark = css`
  &:hover::-webkit-scrollbar-track {
    background-color: ${colors.background};
  }
  &:hover::-webkit-scrollbar-thumb {
    background-color: ${colors.blue};
  }
`;

const buttonStyle = css`
  background-color: ${colors.backgroundDark};
  &:hover {
    background-color: ${colors.backgroundHover};
  }
  color: ${colors.white};
  border: none;
  font-size: inherit;
  padding: 0 1em;
  outline: none;
`;

const buttonStyleMedium = css`
  ${buttonStyle};
  padding: 0.5em 1em;
`;

const inputStyle = css`
  background-color: ${colors.backgroundDark};
  border: none;
  outline: 2px dashed ${colors.backgroundLight};
  color: ${colors.white};
  font-family: inherit;
  font-size: inherit;
  margin: 0;
  &:focus {
    outline: 2px dashed ${colors.blue};
  }
  word-wrap: pre;
  white-space: pre;
`;

const inputStyleMedium = css`
  ${inputStyle};
  padding: 0.5em;
`;

function App() {
  const contacts = useContacts();
  const [newContactName, setNewContactName] = useState("");
  const [me, setMe] = useState("fred");
  const [recipient, setRecipient] = useState("");
  const conversation = useConversation(me, recipient);
  const [tail, setTail] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const element = scrollContainerRef.current;
    if (element) {
      const onScroll = (event: Event) => {
        const tail =
          element.scrollHeight - element.scrollTop === element.clientHeight;
        setTail(tail);
      };
      element.addEventListener("scroll", onScroll);
      return () => {
        element.removeEventListener("scroll", onScroll);
      };
    }
  }, []);
  return (
    <div
      className={css`
        display: grid;
        grid-template-columns: 240px 1fr;
        grid-template-rows: min-content 1fr;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      `}
    >
      <div
        className={css`
          grid-column: 1 / span 2;
          grid-row: 1;
          background-color: ${colors.backgroundDark};
          -webkit-app-region: drag;
          display: flex;
        `}
      >
        <div
          className={css`
            flex-grow: 1;
          `}
        />
        <button
          onClick={() => {
            ipcRenderer.send("app:quit");
          }}
          className={css`
            ${buttonStyle}
            -webkit-app-region: no-drag;
            &:hover {
              color: ${colors.red};
              background-color: ${colors.backgroundDark};
            }
          `}
        >
          ⬤
        </button>
      </div>
      <div
        className={css`
          grid-column: 1;
          grid-row: 2;
          background-color: ${colors.backgroundDark};
          display: flex;
          flex-direction: column;
        `}
      >
        <div
          className={css`
            display: flex;
            padding: 0 1em;
            align-items: center;
            height: 50px;
            position: relative;
          `}
        >
          <input
            value={newContactName}
            onChange={(event) => setNewContactName(event.currentTarget.value)}
            spellCheck={false}
            className={css`
              ${inputStyleMedium};
              padding-right: 3em;
              width: 100%;
            `}
          />
          <button
            onClick={() => {
              contacts.add(newContactName);
              setNewContactName("");
            }}
            className={css`
              ${buttonStyleMedium};
              position: absolute;
              right: 1em;
              border-left: 1px solid ${colors.backgroundLight};
            `}
          >
            +
          </button>
        </div>
        <div
          className={css`
            flex-grow: 1;
            overflow-x: hidden;
            overflow-y: overlay;
            position: relative;
            ${scrollStyleDark};
          `}
        >
          <div
            className={css`
              position: absolute;
              width: 100%;
              padding-bottom: 4px;
            `}
          >
            {contacts.alphaOrderedList.map((contact) => {
              return (
                <div
                  key={contact.id}
                  onClick={() => {
                    setRecipient(contact.name);
                  }}
                  className={css`
                    &:hover {
                      background-color: ${colors.backgroundHover};
                    }
                    display: flex;
                    align-items: center;
                    padding-left: 1em;
                  `}
                >
                  <div
                    className={css`
                      width: 48px;
                      height: 48px;
                      border-radius: 4px;
                      background-color: ${colors.background};
                    `}
                  />
                  <div
                    className={css`
                      padding: 16px 1em;
                    `}
                  >
                    {contact.name || "John Doe"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          className={css`
            border-top: 1px solid ${colors.backgroundLight};
            display: flex;
            align-items: center;
            padding: 1em;
          `}
        >
          <div>me</div>
          <div
            className={css`
              flex-grow: 1;
            `}
          >
            <input
              value={me}
              onChange={(event) => setMe(event.currentTarget.value)}
              spellCheck={false}
              className={css`
                ${inputStyle};
                width: 100%;
              `}
            />
          </div>
        </div>
      </div>
      <div
        className={css`
          grid-column: 2;
          grid-row: 2;
          display: flex;
          flex-direction: column;
        `}
      >
        <div
          ref={scrollContainerRef}
          className={css`
            position: relative;
            flex-grow: 1;
            overflow-x: hidden;
            overflow-y: overlay;
            ${scrollStyleLight};
          `}
        >
          <div
            className={css`
              position: absolute;
              width: 100%;
            `}
          >
            {conversation.chronoOrderedList.map((message, index, array) => {
              const displayName =
                message.sender === me
                  ? me
                  : message.sender === recipient
                  ? recipient
                  : undefined;
              const previous = array[index - 1];
              const previousFormattedDate =
                previous && formatMessageDate(previous.date);
              const formattedDate = formatMessageDate(message.date);
              const showDayHeader =
                !previous || formattedDate !== previousFormattedDate;
              const showContactHeader =
                showDayHeader ||
                !previous ||
                message.sender !== previous.sender;
              return (
                <React.Fragment key={message.id}>
                  {showDayHeader && (
                    <div
                      className={css`
                        position: sticky;
                        top: 0;
                        background-color: ${colors.background};
                        color: ${colors.gray};
                        border-bottom: 1px solid ${colors.backgroundLight};
                        margin: 1em;
                      `}
                    >
                      {formatMessageDate(message.date)}
                    </div>
                  )}
                  {showContactHeader && (
                    <div
                      className={css`
                        margin-top: ${showContactHeader ? "1em" : "0"};
                      `}
                    >
                      <ContactHeader name={displayName} />
                    </div>
                  )}
                  <div
                    className={css`
                      display: flex;
                      padding: 0 0 0 1em;
                    `}
                  >
                    <div
                      className={css`
                        color: ${colors.gray};
                        width: 42px;
                        text-align: center;
                      `}
                    >
                      {formatMessageTime(message.date)}
                    </div>
                    <div
                      className={css`
                        white-space: pre;
                        padding: 0 1em;
                      `}
                      ref={(element) => {
                        if (tail && element && index + 1 === array.length) {
                          element.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    >
                      {message.text}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <MessageCompositor me={me} onSend={conversation.send} />
      </div>
    </div>
  );
}

let messageTimeFormatter = new Intl.DateTimeFormat([], {
  timeStyle: "short",
} as any);

function MessageCompositor({
  me,
  onSend,
}: {
  me: string;
  onSend(text: string): void;
}) {
  const [messageText, setMessageText] = useState("");
  const [messageTextRows, setMessageTextRows] = useState(1);

  return (
    <div
      className={css`
        margin-top: 0.5em;
        padding-top: 0.5em;
        border-top: 1px solid ${colors.backgroundLight};
      `}
    >
      <ContactHeader name={me} />
      <div
        className={css`
          display: flex;
          padding: 0 1em 1em 1em;
        `}
      >
        <div
          className={css`
            color: ${colors.gray};
            width: 42px;
            text-align: center;
          `}
        >
          {formatMessageTime(new Date())}
        </div>
        <textarea
          value={messageText}
          onChange={(event) => {
            setMessageText(event.currentTarget.value);
            const rows = Math.min(
              10,
              (event.currentTarget.value.match(/\n/g)?.length ?? 0) + 1
            );
            setMessageTextRows(rows);
          }}
          rows={messageTextRows}
          spellCheck={false}
          className={css`
            ${inputStyle};
            resize: none;
            overflow-x: auto;
            overflow-y: auto;
            flex-grow: 1;
            padding: 0em;
            margin-left: 1em;
            background-color: ${colors.background};
            ${scrollStyleDark};
          `}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend(messageText);
              setMessageText("");
            }
          }}
        />
      </div>
    </div>
  );
}

function ContactHeader({ name }: { name?: string }) {
  return (
    <div
      className={css`
        display: grid;
        grid-template-columns: auto 1fr auto;
        grid-template-rows: auto auto auto;
        grid-column-gap: 1em;
        padding: 0 1em;
        background-color: ${colors.background};
      `}
    >
      <div
        className={css`
          width: 42px;
          height: 42px;
          border-radius: 4px;
          background-color: ${colors.backgroundDark};
          grid-column: 1;
          grid-row: 1 / span 2;
        `}
      />
      <div
        className={css`
          grid-column: 2;
          grid-row: 1;
          font-weight: 500;
          color: ${colors.gray};
        `}
      >
        {name}
      </div>
      <div
        className={css`
          grid-column: 2;
          grid-row: 2;
          color: ${colors.gray};
        `}
      >
        {name}
      </div>
    </div>
  );
}

function formatMessageTime(date: Date) {
  return messageTimeFormatter.format(date);
}

let messageDateFormatter = new Intl.DateTimeFormat([], {
  dateStyle: "full",
} as any);
function formatMessageDate(date: Date) {
  return messageDateFormatter.format(date);
}

type Contact = {
  id: string;
  name: string;
};
function useContacts() {
  const [map, setMap] = useState<Record<string, Contact>>({});
  const alphaOrderedList = useMemo(() => {
    const collator = new Intl.Collator().compare;
    return Object.values(map).sort((a, b) => collator(a.name, b.name));
  }, [map]);
  const add = (name: string) => {
    addStringBlock(JSON.stringify({ type: "contact", name }));
  };
  useEffect(() => {
    const update = (hash: Buffer, data: Buffer) => {
      try {
        const json = JSON.parse(data.toString());
        if (json.type === "contact" && typeof json.name === "string") {
          setMap((contacts) => ({
            ...contacts,
            [json.name]: { id: json.name, name: json.name },
          }));
        }
      } catch (error) {}
    };
    subscribeBlocks(update);
    return () => {
      unsubscribeBlocks(update);
    };
  }, []);
  return { map, add, alphaOrderedList };
}

function useConversation(sender: string, recipient: string) {
  type Message = {
    id: string;
    sender: string;
    recipient: string;
    text: string;
    date: Date;
  };
  const [messages, setMessages] = useState<Record<string, Message>>({});
  const chronoOrderedList = useMemo(() => {
    return Object.values(messages).sort(
      (a, b) => a.date.valueOf() - b.date.valueOf()
    );
  }, [messages]);
  const send = (text: string) => {
    addStringBlock(
      JSON.stringify({
        type: "message",
        sender,
        recipient,
        text,
        creationTimestamp: Date.now(),
      })
    );
  };
  useEffect(() => {
    const update = (hash: Buffer, data: Buffer) => {
      try {
        const id = hash.toString("hex");
        const json = JSON.parse(data.toString());
        if (
          json.type === "message" &&
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
              date: new Date(json.creationTimestamp),
            },
          }));
        }
      } catch (error) {}
    };
    subscribeBlocks(update);
    return () => {
      setMessages({});
      unsubscribeBlocks(update);
    };
  }, [sender, recipient]);
  return {
    chronoOrderedList,
    send,
  };
}
