import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { css, injectGlobal } from "emotion";
import { Hash, hashFromBlock } from "p2p-network-tools-node-nodejs";

type Props = {
  subscribeBlock(
    hash: Hash,
    onBlock: (block: Buffer) => void
  ): { unsubscribe(): void };
  provideBlock(block: Buffer): void;
};

injectGlobal`
  body {
    margin: 0;
  }
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400&display=swap');
`;

export function start(props: Props) {
  ReactDOM.render(
    <React.StrictMode>
      <App {...props} />
    </React.StrictMode>,
    document.getElementById("root")
  );
}

function App({ subscribeBlock, provideBlock }: Props) {
  const [text, setText] = useState("");
  const [tabs, setTabs] = useState<
    Array<{ hash: Buffer; unsubscribe(): void }>
  >([]);
  const addTab = (hash: Hash) => {
    const { unsubscribe } = subscribeBlock(hash, (block) => {
      // console.log(hash.toString("hex"), block.toString());
    });
    setTabs([{ hash, unsubscribe }, ...tabs]);
    setText("");
  };
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const selectedTab = tabs[selectedTabIndex];
  const [content, setContent] = useState<Buffer | null>(null);
  useEffect(() => {
    if (selectedTab) {
      const { unsubscribe } = subscribeBlock(selectedTab.hash, setContent);
      return () => {
        unsubscribe();
        setContent(null);
      };
    }
  }, [selectedTab, subscribeBlock]);
  return (
    <div
      className={css`
        width: 100vw;
        height: 100vh;
        background-color: ${colors.background};
        color: ${colors.white};
        font-family: "Fira Code", monospace;
        display: grid;
        grid-template-columns: 300px auto;
        grid-template-rows: auto 1fr;
        grid-template-areas:
          "side status"
          "side main";
      `}
    >
      <div
        className={css`
          grid-area: side;
          background-color: ${colors.backgroundDark};
        `}
      >
        <button
          onClick={() => {
            setSelectedTabIndex(NaN);
          }}
        >
          actions
        </button>
        {tabs.map((tab, index) => {
          const isOpen = index === selectedTabIndex;
          return (
            <div
              key={index}
              className={css`
                padding: 0ch 1ch;
                cursor: default;
                background-color: ${isOpen
                  ? colors.backgroundHover
                  : "inherit"};
                &:hover {
                  background-color: ${colors.backgroundHover};
                  .hover-action {
                    visibility: visible;
                  }
                }
                position: relative;
                display: flex;
              `}
            >
              <div
                onClick={() => {
                  setSelectedTabIndex(index);
                }}
                className={css`
                  flex-grow: 1;
                `}
              >
                <div
                  className={css`
                    width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                >
                  <span
                    className={css`
                      color: ${colors.gray};
                    `}
                  >
                    #
                  </span>
                  {tab.hash.toString("hex")}
                </div>
              </div>
              <div
                className={
                  "hover-action " +
                  css`
                    position: absolute;
                    top: 0px;
                    right: 0px;
                    visibility: ${isOpen ? "visible" : "hidden"};
                    padding: 0ch 1ch;
                    background-color: "inherit";
                  `
                }
                onClick={() => {
                  tab.unsubscribe();
                  setTabs(tabs.filter((t, i) => i !== index));
                }}
              >
                x
              </div>
            </div>
          );
        })}
      </div>
      <div
        className={css`
          grid-area: status;
          background-color: ${colors.backgroundDark};
          padding: 0ch 1ch;
        `}
      >
        {selectedTab && (
          <>
            <span
              className={css`
                color: ${colors.gray};
              `}
            >
              #
            </span>
            <span>{selectedTab.hash.toString("hex")}</span>
          </>
        )}
      </div>
      <div
        className={css`
          grid-area: main;
          padding: 0.5ch 1ch;
        `}
      >
        {selectedTab ? (
          content?.toString()
        ) : (
          <>
            <h2>Add tab</h2>
            <input
              value={text}
              onChange={(event) => setText(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const hash = Buffer.from(text, "hex");
                  if (hash.length === 32) {
                    addTab(hash);
                  }
                }
              }}
              className={css`
                background-color: inherit;
              `}
            />
            <hr />
            <h2>Add text block</h2>
            <AddBlock />
          </>
        )}
      </div>
    </div>
  );

  function AddBlock() {
    const [text, setText] = useState("");
    const block = Buffer.from(text);
    const hash = hashFromBlock(block);
    return (
      <div>
        <div
          className={css`
            width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {hash.toString("hex")}
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          className={css`
            width: 300px;
            background-color: inherit;
          `}
        />
        <button
          onClick={() => {
            addTab(hash);
            provideBlock(block);
          }}
        >
          add
        </button>
      </div>
    );
  }
}

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
