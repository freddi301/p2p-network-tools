import React, { useContext, useEffect, useMemo, useState } from "react";
import CBOR from "cbor";
// @ts-ignore
import { ReactQueryDevtools } from "react-query-devtools";
import {
  useQuery,
  useMutation,
  useQueryCache,
  QueryCache,
  ReactQueryCacheProvider,
} from "react-query";
import styled, { css } from "styled-components/macro";

export default function App() {
  const { hosts, addHost, removeHost } = useHosts();
  const [selectedHost, setSelectedHost] = useState(hosts[0]);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  return (
    <div
      css={css`
        background: ${colors.background};
        color: ${colors.primary};
        width: 100vw;
        height: 100vh;
        font-family: "Fira Code", monospace;
        display: grid;
        grid-template-columns: [lefty] ${showLeftPanel ? "250px" : "0px"} [mid] auto;
        grid-template-rows: [topper] auto [upper] 1fr [lower] 300px;
      `}
    >
      <div
        css={css`
          grid-column: 1 / -1;
          grid-row: topper;
        `}
      >
        <StyledButtonHorizontalGroup
          css={css`
            width: fit-content;
          `}
        >
          <StyledButton
            onClick={() => {
              setShowLeftPanel(!showLeftPanel);
            }}
          >
            ⚙
          </StyledButton>
        </StyledButtonHorizontalGroup>
      </div>
      {showLeftPanel && (
        <div
          css={css`
            grid-column: lefty;
            grid-row: upper;
          `}
        >
          <Hosts
            hosts={hosts}
            onAdd={addHost}
            onRemove={removeHost}
            selected={selectedHost}
            onSelect={setSelectedHost}
          />
        </div>
      )}
      {hosts.map((host) => {
        return (
          <React.Fragment key={host}>
            <HostContext host={host}>
              {host === selectedHost && <Control />}
              <div
                css={css`
                  grid-column: mid;
                  grid-row: upper / lower;
                `}
                hidden={host !== selectedHost}
              >
                <Main />
              </div>
              {showLeftPanel && (
                <div
                  css={css`
                    grid-column: lefty;
                    grid-row: lower;
                  `}
                  hidden={host !== selectedHost}
                >
                  <Connections />
                </div>
              )}
            </HostContext>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function useHosts() {
  const [hosts, setHosts] = useState<Array<string>>([
    "localhost:8086",
    "localhost:8087",
  ]);
  const addHost = (host: string) => {
    if (!hosts.includes(host)) {
      setHosts([...hosts, host]);
    }
  };
  const removeHost = (host: string) => {
    setHosts(hosts.filter((h) => h !== host));
  };
  return { hosts, addHost, removeHost };
}

type HostsProps = {
  hosts: Array<string>;
  onAdd(host: string): void;
  onRemove(host: string): void;
  selected: string | undefined;
  onSelect(host: string): void;
};
function Hosts({ hosts, onAdd, onRemove, selected, onSelect }: HostsProps) {
  const [text, setText] = useState("localhost:");
  const add = () => {
    onAdd(text);
    setText("localhost:");
  };
  return (
    <div
      css={css`
        background-color: ${colors.backgroundDark};
        height: 100%;
      `}
    >
      <StyledHeader>backends</StyledHeader>
      <div>
        <StyledInput
          value={text}
          placeholder="localhost:8086"
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              add();
            }
          }}
          css={css`
            width: 100%;
          `}
        />
      </div>
      {hosts.map((host) => {
        return (
          <div
            key={host}
            css={css`
              border-left: 1px solid ${colors.background};
            `}
          >
            <StyledButtonDiv
              onClick={() => onSelect(host)}
              tabIndex={0}
              active={host === selected}
              css={css`
                display: flex;
              `}
            >
              <div
                css={css`
                  flex-grow: 1;
                `}
              >
                {host}
              </div>
              <StyledButtonLink
                onClick={() => {
                  onRemove(host);
                }}
                css={css`
                  margin-right: -1ch;
                `}
              >
                🗙
              </StyledButtonLink>
            </StyledButtonDiv>
          </div>
        );
      })}
    </div>
  );
}

const colors = {
  background: "#282c34",
  backgroundDark: "#21252b",
  backgroundLight: "#2c313c",
  hoverBackground: "#292d35",
  focusBackground: "#2c313a",
  primary: "#abb2bf",
  comment: "#5c6370",
};

const StyledInput = styled.input`
  font-size: 100%;
  font-family: inherit;
  text-decoration: none;
  color: inherit;
  padding: 0px 1ch 0px 1ch;
  outline: none;
  background-color: inherit;
  border-top: none;
  border-right: none;
  border-bottom: 1px solid ${colors.comment};
  border-left: none;
  box-sizing: border-box;
  &:focus {
    background-color: ${colors.background};
  }
`;

const StyledTextArea = styled.textarea`
  font-size: 100%;
  font-family: inherit;
  text-decoration: none;
  color: inherit;
  padding: 0px 1ch 0px 1ch;
  outline: none;
  background-color: inherit;
  border-top: none;
  border-right: 1px solid ${colors.comment};
  border-left: 1px solid ${colors.comment};
  border-bottom: none;
  box-sizing: border-box;
  &:focus {
    background-color: ${colors.background};
  }
`;

const StyledButton = styled.button`
  font-size: 100%;
  font-family: inherit;
  color: inherit;
  padding: 0px 1ch 0px 1ch;
  text-transform: none;
  outline: none;
  background-color: inherit;
  border: none;
  &:hover {
    background-color: ${colors.hoverBackground};
  }
  &:focus {
    background-color: ${colors.focusBackground};
  }
`;

const StyledButtonDiv = styled.div<{ active: boolean }>`
  font-size: 100%;
  font-family: inherit;
  color: inherit;
  padding: 0px 1ch 0px 1ch;
  text-transform: none;
  outline: none;
  background-color: ${(props) =>
    props.active ? colors.hoverBackground : "inherit"};
  border: none;
  cursor: default;
  &:hover {
    background-color: ${colors.hoverBackground};
  }
  &:focus {
    background-color: ${colors.focusBackground};
  }
`;

const StyledButtonLink = styled.button`
  font-size: 100%;
  font-family: inherit;
  color: ${colors.comment};
  padding: 0px 1ch 0px 1ch;
  text-transform: none;
  outline: none;
  background-color: inherit;
  border: none;
  cursor: default;
  &:hover {
    color: ${colors.primary};
  }
  &:focus {
    background-color: ${colors.focusBackground};
  }
`;

const StyledButtonHorizontalGroup = styled.div`
  background-color: ${colors.backgroundDark};
  ${StyledButton} {
    border-right: ${colors.background};
  }
`;

const StyledHeader = styled.div`
  background-color: ${colors.background};
  padding: 0px 1ch 0px 1ch;
`;

type API = import("../../backend/src").API;
const ApiContext = React.createContext<API>(null as any);

function useWebSocketApi(host: string) {
  const { ws, api } = useMemo(() => {
    const ws = new WebSocket(`ws://${host}`);
    ws.binaryType = "arraybuffer";
    ws.addEventListener("message", (event) => {
      const { id, result } = CBOR.decode(Buffer.from(event.data));
      pendingRpcCalls.get(id)?.(result);
      pendingRpcCalls.delete(id);
    });
    let nextRpcId = 1;
    const pendingRpcCalls = new Map<number, (result: any) => void>();
    const api: API = new Proxy({} as any, {
      get(target, method) {
        return (...params: any[]) =>
          new Promise((resolve) => {
            const id = nextRpcId++;
            pendingRpcCalls.set(id, resolve);
            const sendit = () => ws.send(CBOR.encode({ id, method, params }));
            if (ws.readyState === ws.OPEN) {
              sendit();
            } else {
              ws.addEventListener("open", sendit);
            }
          });
      },
    });
    return { ws, api };
  }, [host]);

  useEffect(
    () => () => {
      ws.close();
    },
    [ws]
  );
  return api;
}

function HostContext({
  host,
  children,
}: {
  host: string;
  children: React.ReactNode;
}) {
  const api = useWebSocketApi(host);
  const queryCache = useMemo(() => new QueryCache(), [host]);
  useEffect(
    () => () => {
      queryCache.clear();
    },
    [queryCache]
  );
  return (
    <ApiContext.Provider value={api}>
      <ReactQueryCacheProvider queryCache={queryCache}>
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen />
        )}
      </ReactQueryCacheProvider>
    </ApiContext.Provider>
  );
}

function Main() {
  const api = useContext(ApiContext);
  const allHashInfoQuery = useQuery("allHashInfo", api.getAllHashInfo);
  return (
    <div
      css={css`
        display: flex;
      `}
    >
      <div
        css={css`
          flex-grow: 1;
          padding-left: 1ch;
          padding-left: 1ch;
          height: fit-content;
          display: grid;
          grid-template-columns: [hash] auto [size] auto [preview] auto;
          column-gap: 2ch;
        `}
        style={{
          gridTemplateRows: `repeat(${
            (allHashInfoQuery.data?.length ?? 0) + 1
          }, [entry] auto [separator] auto)`,
        }}
      >
        <React.Fragment>
          <div
            css={css`
              grid-column: hash;
              grid-row: entry 1;
            `}
          >
            hash [hex]
          </div>
          <div
            css={css`
              grid-column: size;
              grid-row: entry 1;
            `}
          >
            size [bytes]
          </div>
          <div
            css={css`
              grid-column: preview;
              grid-row: entry 1;
            `}
          >
            preview [text]
          </div>
          <div
            css={css`
              grid-column: 1 / -1;
              grid-row: separator 1;
              border-bottom: 1px solid ${colors.backgroundLight};
              margin-top: 4px;
            `}
          ></div>
        </React.Fragment>
        {allHashInfoQuery.data?.map(({ hash, size }, index) => {
          const gridRow = `entry ${index + 2}`;
          return (
            <React.Fragment key={hash.toString()}>
              <div
                css={css`
                  grid-column: hash;
                `}
                style={{ gridRow }}
              >
                {Buffer.prototype.toString.call(hash, "hex")}
              </div>
              <div
                css={css`
                  grid-column: size;
                `}
                style={{ gridRow }}
              >
                {size}
              </div>
              <div
                css={css`
                  grid-column: preview;
                `}
                style={{ gridRow }}
              >
                <PreviewBlockAsText hash={hash} />
              </div>
              <div
                css={css`
                  grid-column: 1 / -1;
                  border-bottom: 1px solid ${colors.backgroundLight};
                `}
                style={{ gridRow: `separator ${index + 2}` }}
              ></div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function Control() {
  const api = useContext(ApiContext);
  const cache = useQueryCache();
  const [addBlock] = useMutation(api.addBlock, {
    onSuccess() {
      cache.invalidateQueries("allHashInfo");
    },
  });
  const [addHash] = useMutation(api.addHash, {
    onSuccess() {
      cache.invalidateQueries("allHashInfo");
    },
  });
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div
      css={css`
        position: fixed;
        top: 2px;
        left: 10vw;
      `}
    >
      <StyledTextArea
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        css={css`
          resize: none;
          width: 80vw;
        `}
        onFocus={() => setIsFocused(true)}
        onBlur={() => () => setIsFocused(false)}
        style={isFocused ? { height: "50vh" } : { height: "21px" }}
      />
      {isFocused && (
        <StyledButtonHorizontalGroup>
          <StyledButton
            onClick={() => {
              addBlock(Buffer.from(text));
              setText("");
              setIsFocused(false);
            }}
          >
            add block [text]
          </StyledButton>
          <StyledButton
            onClick={() => {
              addHash(Buffer.from(text, "hex"));
              setText("");
              setIsFocused(false);
            }}
          >
            add hash [hex]
          </StyledButton>
        </StyledButtonHorizontalGroup>
      )}
    </div>
  );
}

function Connections() {
  const api = useContext(ApiContext);
  const cache = useQueryCache();
  const connectionsQuery = useQuery("connections", api.getConnections);
  useEffect(() => {
    const intervalId = setInterval(() => {
      cache.invalidateQueries("connections");
    }, 3000);
    return () => clearInterval(intervalId);
  }, [cache]);

  return (
    <>
      <StyledHeader
        css={css`
          display: flex;
        `}
      >
        <div
          css={css`
            flex-grow: 1;
          `}
        >
          connections
        </div>
        <div>{connectionsQuery.data?.length}</div>
      </StyledHeader>
      <div
        css={css`
          width: 100%;
          height: calc(100% - 21px);
          overflow: scroll;
        `}
      >
        <pre>{JSON.stringify(connectionsQuery.data, null, 2)}</pre>
      </div>
    </>
  );
}

function PreviewBlockAsText({ hash }: { hash: Buffer }) {
  const api = useContext(ApiContext);
  const blockQuery = useQuery(
    ["block", hash.toString("hex")],
    (k, h: string) => api.getBlockOfHash(Buffer.from(h, "hex")),
    { staleTime: Infinity }
  );
  return (
    <pre
      css={css`
        margin: 0px;
        font-family: inherit;
        font-size: inherit;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
      `}
    >
      {blockQuery.data?.toString()}
    </pre>
  );
}
