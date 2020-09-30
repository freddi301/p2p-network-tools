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
  const [tabs, setTabs] = useState<
    Array<{ hash: Buffer; unsubscribe(): void }>
  >([]);
  const addTab = (hash: Hash) => {
    const { unsubscribe } = subscribeBlock(hash, (block) => {
      // console.log(hash.toString("hex"), block.toString());
    });
    setTabs([{ hash, unsubscribe }, ...tabs]);
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
  const [hashText, setHashText] = useState("");
  const [editText, setEditText] = useState("");
  const openHash = () => {
    const hash = Buffer.from(hashText, "hex");
    if (hash.length === 32) {
      addTab(hash);
      setSelectedTabIndex(0);
      setHashText("");
    }
  };
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
        <div
          onClick={() => {
            setSelectedTabIndex(NaN);
          }}
          className={css`
            cursor: default;
            padding: 0ch 1ch;
            background-color: ${!selectedTab
              ? colors.backgroundHover
              : "inherit"};
            &:hover {
              background-color: ${colors.backgroundHover};
            }
            text-align: center;
          `}
        >
          <span role="img" aria-label="home">
            🏠
          </span>
        </div>
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
        `}
      >
        {selectedTab ? (
          <div
            className={css`
              padding: 1ch;
            `}
          >
            {content?.toString()}
          </div>
        ) : (
          <div
            className={css`
              display: flex;
              justify-content: center;
            `}
          >
            <div
              className={css`
                width: 100%;
                padding: 0 1ch;
              `}
            >
              <p
                className={css`
                  text-align: center;
                `}
              >
                This app lets you share read-only text over internet or your
                wifi.
                <br />
                No account or server needed.
                <br />
              </p>
              <div
                className={css`
                  display: flex;
                  margin: 1em 0;
                  flex-direction: row-reverse;
                `}
              >
                <div
                  className={css`
                    cursor: default;
                    padding: 0.5em;
                    background-color: ${colors.backgroundDark};
                    &:hover {
                      background-color: ${colors.backgroundHover};
                    }
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  `}
                  onClick={() => {
                    openHash();
                  }}
                >
                  open
                </div>
                <input
                  placeholder="paste hash"
                  value={hashText}
                  onChange={(event) => setHashText(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      openHash();
                    }
                  }}
                  className={css`
                    flex-grow: 1;
                    padding: 0.5em;
                    background-color: ${colors.backgroundDark};
                    color: inherit;
                    font-family: inherit;
                    font-size: inherit;
                    border: 0;
                    outline: 2px dashed ${colors.backgroundLight};
                    &:focus {
                      outline: 2px dashed ${colors.blue};
                    }
                  `}
                />
              </div>
              <div
                className={css`
                  margin: 1em 0;
                  flex-grow: 1;
                `}
              >
                <textarea
                  value={editText}
                  onChange={(event) => setEditText(event.currentTarget.value)}
                  placeholder="write something smart"
                  className={css`
                    width: 100%;
                    min-height: 400px;
                    padding: 1em;
                    resize: none;
                    background-color: ${colors.backgroundDark};
                    color: inherit;
                    font-family: inherit;
                    font-size: inherit;
                    border: 0;
                    outline: 2px dashed ${colors.backgroundLight};
                    &:focus {
                      outline: 2px dashed ${colors.blue};
                    }
                  `}
                />
                <div
                  onClick={() => {
                    const block = Buffer.from(editText);
                    const hash = hashFromBlock(block);
                    addTab(hash);
                    setSelectedTabIndex(0);
                    provideBlock(block);
                    setEditText("");
                  }}
                  className={css`
                    cursor: default;
                    padding: 0.5em;
                    background-color: ${colors.backgroundDark};
                    &:hover {
                      background-color: ${colors.backgroundHover};
                    }
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  `}
                >
                  save
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
