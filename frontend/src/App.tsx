import React, { useCallback, useEffect, useState } from "react";
import { css } from "styled-components/macro";
import { rpc } from "./components/api";
import { BackendSelect } from "./components/BackendSelect";
import { colors } from "./components/colors";
import { ImportSelect } from "./components/ImportSelect";
import {
  StyledSimpleAction,
  StyledSimpleActionSeparator,
  StyledSimpleButton,
} from "./components/ui";
import { useBackends } from "./components/useBackends";

export default function App() {
  const {
    add: addBackend,
    remove: removeBackend,
    list: backendList,
  } = useBackends();
  const [selectedBackend, setSelectedBackend] = useState("localhost:8086");
  const { addHash, addBlock, all, refresh } = useApi(selectedBackend);
  useEffect(() => {
    addBackend("localhost:8086");
    setTimeout(() => {
      refresh();
    }, 1000);
  }, [addBackend, refresh]);
  return (
    <div
      css={css`
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        display: grid;
        grid-template-rows: [bar] min-content [main] auto;
        font-family: "Fira Code", monospace;
        background-color: ${colors.background};
      `}
    >
      <div
        css={css`
          grid-row: main;
          overflow-x: hidden;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
        `}
      >
        <div
          css={css`
            display: grid;
            grid-template-columns: [hash] auto [size] auto [preview] auto;
            background-color: ${colors.background};
            grid-column-gap: 2ch;
            padding-left: 1ch;
            padding-right: 1ch;
          `}
        >
          <div
            css={css`
              grid-row: 1;
              grid-column: hash;
              position: sticky;
              top: 0;
              background-color: ${colors.background};
              color: ${colors.white};
            `}
          >
            hash[hex]
          </div>
          <div
            css={css`
              grid-row: 1;
              grid-column: size;

              position: sticky;
              top: 0;
              background-color: ${colors.background};
              color: ${colors.white};
            `}
          >
            size[bytes]
          </div>
          <div
            css={css`
              grid-row: 1;
              grid-column: preview;
              position: sticky;
              top: 0;
              background-color: ${colors.background};
              color: ${colors.white};
            `}
          >
            content[text]
          </div>
          {all.map(({ hash, size, block }, index) => {
            const gridRow = index + 2;
            return (
              <React.Fragment key={hash.toString("hex")}>
                <div
                  css={css`
                    grid-column: hash;
                    scroll-snap-align: start;
                    color: ${colors.white};
                  `}
                  style={{
                    gridRow,
                  }}
                >
                  {hash.toString("hex")}
                </div>
                <div
                  css={css`
                    grid-column: size;
                    color: ${colors.white};
                  `}
                  style={{
                    gridRow,
                  }}
                >
                  {size}
                </div>
                <div
                  css={css`
                    grid-column: preview;
                    color: ${colors.white};
                  `}
                  style={{
                    gridRow,
                  }}
                >
                  {block?.toString()}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div
        css={css`
          grid-row: bar;
          background-color: ${colors.backgroundDark};
          display: flex;
        `}
      >
        <BackendSelect
          selected={selectedBackend}
          list={backendList}
          onAdd={addBackend}
          onRemove={removeBackend}
          onSelect={setSelectedBackend}
        />
        <StyledSimpleActionSeparator />
        <ImportSelect onAddHash={addHash} onAddBlock={addBlock} />
        <StyledSimpleActionSeparator />
        <StyledSimpleButton
          onClick={() => {
            refresh();
          }}
        >
          refresh
        </StyledSimpleButton>
        <StyledSimpleActionSeparator />
      </div>
    </div>
  );
}

function useApi(backend: string) {
  const addBlock = (block: Buffer) => {
    rpc(backend, "addBlock", block).then(refresh);
  };
  const addHash = (hash: Buffer) => {
    rpc(backend, "addHash", hash).then(refresh);
  };
  const [all, setAll] = useState<
    Array<{ hash: Buffer; size?: number; block?: Buffer }>
  >([]);
  const refresh = useCallback(() => {
    rpc(backend, "getAll").then((data) => {
      setAll(data);
    });
  }, [backend]);
  return { all, addBlock, addHash, refresh };
}
