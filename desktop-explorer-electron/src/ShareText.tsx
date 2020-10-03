import React, { useEffect, useState } from "react";
import { css } from "emotion";
import { Hash, hashFromBlock } from "p2p-network-tools-node-nodejs";
import { colors } from "./colors";
import { Props } from "./gui";

export function ShareText({ subscribeBlock, provideBlock }: Props) {
  const [tabs, setTabs] = useState<
    Array<{ hash: Buffer; unsubscribe(): void }>
  >([]);
  const addTab = (hash: Hash) => {
    const { unsubscribe } = subscribeBlock(hash, (block) => {
      // console.log(hash.toString("hex"), block.toString());
    });
    setTabs((tabs) => [{ hash, unsubscribe }, ...tabs]);
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
        height: calc(100vh - 37px);
        overflow: hidden;
        background-color: ${colors.background};
        color: ${colors.white};
        font-family: "Fira Code", monospace;
        display: grid;
        grid-template-columns: [side] 250px [main] auto;
        grid-template-rows: [top] auto [center] 1fr [end];
      `}
    >
      <div
        onClick={() => {
          setSelectedTabIndex(NaN);
        }}
        className={css`
          grid-column: side;
          grid-row: top;
          cursor: default;
          padding: 0.5em;
          background-color: ${!selectedTab
            ? colors.backgroundHover
            : colors.backgroundDark};
          &:hover {
            background-color: ${colors.backgroundHover};
          }
          text-align: center;
          transition: 0.3s;
          user-select: none;
        `}
      >
        <span role="img" aria-label="home">
          home
        </span>
      </div>
      <div
        className={css`
          grid-column: side;
          grid-row: center;
          background-color: ${colors.backgroundDark};
          overflow-y: auto;
          height: 100%;
          position: relative;
        `}
      >
        <div
          className={css`
            position: absolute;
            width: 100%;
          `}
        >
          {tabs.map((tab, index) => {
            const isOpen = index === selectedTabIndex;
            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedTabIndex(index);
                }}
                className={css`
                  padding: 0.5em;
                  cursor: default;
                  background-color: ${isOpen
                    ? colors.backgroundHover
                    : "inherit"};
                  &:hover {
                    background-color: ${colors.backgroundHover};
                  }
                  display: flex;
                  transition: 0.3s;
                `}
              >
                <div
                  className={css`
                    color: ${colors.gray};
                    padding-right: 0.5em;
                  `}
                >
                  #
                </div>

                <div
                  className={css`
                    flex-grow: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                >
                  {tab.hash.toString("hex")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedTab && (
        <div
          className={css`
            grid-column: main;
            grid-row: top;
            background-color: ${colors.backgroundDark};
            display: flex;
          `}
        >
          <div
            className={css`
              color: ${colors.gray};
              padding: 0.5em 0 0.5em 1em;
            `}
          >
            #
          </div>
          <div
            className={css`
              padding: 0.5em;
            `}
          >
            {selectedTab.hash.toString("hex")}
          </div>
          <div style={{ flexGrow: 1 }} />
          <div
            className={css`
              background-color: ${colors.backgroundDark};
              &:hover {
                background-color: ${colors.backgroundHover};
              }
              user-select: none;
              cursor: default;
              padding: 0.5em;
              justify-self: flex-end;
            `}
            onClick={() => {
              selectedTab.unsubscribe();
              setTabs(tabs.filter((t, i) => i !== selectedTabIndex));
            }}
          >
            elete
          </div>
        </div>
      )}
      {selectedTab ? (
        <div
          className={css`
            grid-column: main;
            grid-row: center;
            overflow: auto;
            position: relative;
            height: 100%;
            box-sizing: border-box;
          `}
        >
          <div
            className={css`
              position: absolute;
              padding: 1em;
              white-space: pre-wrap;
            `}
          >
            {content ? (
              content.toString()
            ) : (
              <span
                className={css`
                  color: ${colors.gray};
                `}
              >
                Looking for somebody with this stuff that is online ...
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className={css`
            grid-column: main;
            grid-row: top / span 2;
            display: flex;
            width: 100%;
            height: 100%;
            padding: 0 1em;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          `}
        >
          <p
            className={css`
              width: 100%;
              text-align: center;
              user-select: none;
            `}
          >
            This app lets you share text over internet or wifi
            <br />
            No account or server needed
            <br />
            <span
              className={css`
                color: ${colors.gray};
              `}
            >
              Both of you must be online to make it work
            </span>
            <br />
          </p>

          <div
            className={css`
              display: flex;
              flex-direction: row-reverse;
              margin-bottom: 1em;
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
                user-select: none;
                transition: 0.3s;
              `}
              onClick={() => {
                openHash();
              }}
            >
              open
            </div>
            <input
              placeholder="paste"
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
              margin-bottom: 1em;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
            `}
          >
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
                user-select: none;
                transition: 0.3s;
              `}
            >
              save
            </div>
            <textarea
              value={editText}
              onChange={(event) => setEditText(event.currentTarget.value)}
              placeholder="write something smart"
              className={css`
                width: 100%;
                flex-grow: 1;
                padding: 0.5em;
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
          </div>
        </div>
      )}
    </div>
  );
}
