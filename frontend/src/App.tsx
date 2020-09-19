import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { css } from "styled-components/macro";
import { useCallbackOnExternalEvent } from "./useCallbackOnExternalEvent";
import { StyledSimpleActionSeparator, StyledSimpleAction } from "./ui";
import { colors } from "./colors";
import { useBackends } from "./useBackends";
import { BackendSelect } from "./BackendSelect";

export default function App() {
  const backends = useBackends();
  const [selectedBackend, setSelectedBackend] = useState(backends.list[0]);
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
      <HashInfoList />
      <div
        css={css`
          grid-row: bar;
          background-color: ${colors.backgroundDark};
          display: flex;
        `}
      >
        <BackendSelect
          selected={selectedBackend}
          list={backends.list}
          onAdd={backends.add}
          onRemove={backends.remove}
          onSelect={setSelectedBackend}
        />
        <StyledSimpleActionSeparator />
        <AddAction />
        <StyledSimpleActionSeparator />
      </div>
    </div>
  );
}

function HashInfoList() {
  const allHashesInfo = useFakeAllHashesInfo();
  // const api = useContext(ApiContext);
  // const allHashInfoQuery = useQuery("allHashInfo", api.getAllHashInfo);
  // const allHashesInfo = allHashInfoQuery.data ?? [];
  return (
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
            color: ${colors.primary};
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
            color: ${colors.primary};
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
            color: ${colors.primary};
          `}
        >
          content[text]
        </div>
        {allHashesInfo.map(({ hash, size }, index) => {
          const gridRow = index + 2;
          return (
            <React.Fragment key={hash.toString("hex")}>
              <div
                css={css`
                  grid-column: hash;
                  scroll-snap-align: start;
                  color: ${colors.primary};
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
                  color: ${colors.primary};
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
                  color: ${colors.primary};
                `}
                style={{
                  gridRow,
                }}
              ></div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function useFakeAllHashesInfo(): Array<{ hash: Buffer; size?: number }> {
  return fakeHashInfo;
}
const fakeHashInfo = new Array(50).fill(null).map((item, index) => {
  return {
    hash: Buffer.from("hello" + index),
    size: "hello".length,
  };
});

function AddAction() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useCallbackOnExternalEvent(
    containerRef,
    "click",
    useCallback(() => {
      setIsOpen(false);
    }, [])
  );
  return (
    <div ref={containerRef} css={{ display: "relative" }}>
      <StyledSimpleAction
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        css={css`
          padding-left: 1ch;
          padding-right: 1ch;
        `}
      >
        +
      </StyledSimpleAction>
      {isOpen && (
        <div
          css={css`
            position: absolute;
            width: 100px;
            background-color: ${colors.backgroundDark};
            padding-left: 1ch;
            padding-right: 1ch;
          `}
        >
          <StyledSimpleAction>hash</StyledSimpleAction>
          <StyledSimpleAction>block</StyledSimpleAction>
        </div>
      )}
    </div>
  );
}

type API = import("../../backend/src").API;
const apiByBackend = new Map<string, API>();
export const websocketRpcHandles = makeWebSocketConnectionHandle((host, ws) => {
  apiByBackend.set(host, makeWebSocketRpc(ws));
  function clean() {
    apiByBackend.delete(host);
  }
  ws.addEventListener("close", clean);
  ws.addEventListener("error", clean);
});

function makeWebSocketRpc(ws: WebSocket) {
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
  return api;
}

function makeWebSocketConnectionHandle(
  init: (host: string, ws: WebSocket) => void
) {
  const handles = new Map<string, ReturnType<typeof make>>();
  function get(host: string) {
    const existing = handles.get(host);
    if (existing) return existing;
    const created = make(host);
    handles.set(host, created);
    return created;
  }
  function make(host: string) {
    let ws: WebSocket | null = null;
    function makeWebSocket() {
      if (ws) {
        ws.removeEventListener("close", notifySubscribers);
        ws.removeEventListener("error", notifySubscribers);
        ws.removeEventListener("open", notifySubscribers);
      }
      ws = new WebSocket(`ws://${host}`);
      init(host, ws);
      ws.addEventListener("close", notifySubscribers);
      ws.addEventListener("error", notifySubscribers);
      ws.addEventListener("open", notifySubscribers);
    }
    function connect() {
      if (!ws) makeWebSocket();
      else if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING)
        makeWebSocket();
    }
    function disconnect() {
      if (!ws) return;
      ws.close();
    }
    function getStatus() {
      if (!ws) return "closed";
      if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING)
        return "closed";
      if (ws.readyState === ws.CONNECTING) return "connecting";
      if (ws.readyState === ws.OPEN) return "open";
      throw new Error();
    }
    type Status = ReturnType<typeof getStatus>;
    const subscribers = new Set<{ callback: (status: Status) => void }>();
    function subscribeStatus(callback: (status: Status) => void) {
      callback(getStatus());
      const subscription = { callback };
      subscribers.add(subscription);
      return () => {
        subscribers.delete(subscription);
      };
    }
    function notifySubscribers() {
      const status = getStatus();
      for (const { callback } of subscribers) {
        callback(status);
      }
    }
    return {
      connect,
      getStatus,
      disconnect,
      subscribeStatus,
    };
  }
  return { get };
}

// function BackendContext({
//   backend,
//   children,
// }: {
//   backend: string;
//   children: React.ReactNode;
// }) {
//   const api = useWebSocketApi(backend);
//   const queryCache = useMemo(() => new QueryCache(), [backend]);
//   useEffect(
//     () => () => {
//       queryCache.clear();
//     },
//     [queryCache]
//   );
//   return (
//     <ApiContext.Provider value={api}>
//       <ReactQueryCacheProvider queryCache={queryCache}>
//         {children}
//         {/* {process.env.NODE_ENV === "development" && (
//           <ReactQueryDevtools initialIsOpen />
//         )} */}
//       </ReactQueryCacheProvider>
//     </ApiContext.Provider>
//   );
// }

// function Control() {
//   const api = useContext(ApiContext);
//   const cache = useQueryCache();
//   const [addBlock] = useMutation(api.addBlock, {
//     onSuccess() {
//       cache.invalidateQueries("allHashInfo");
//     },
//   });
//   const [addHash] = useMutation(api.addHash, {
//     onSuccess() {
//       cache.invalidateQueries("allHashInfo");
//     },
//   });
//   const [text, setText] = useState("");
//   const [isFocused, setIsFocused] = useState(false);
//   return (
//     <div
//       css={css`
//         position: fixed;
//         top: 2px;
//         left: 10vw;
//       `}
//     >
//       <StyledTextArea
//         value={text}
//         onChange={(event) => setText(event.currentTarget.value)}
//         css={css`
//           resize: none;
//           width: 80vw;
//         `}
//         onFocus={() => setIsFocused(true)}
//         onBlur={() => () => setIsFocused(false)}
//         style={isFocused ? { height: "50vh" } : { height: "21px" }}
//       />
//       {isFocused && (
//         <StyledButtonHorizontalGroup>
//           <StyledButton
//             onClick={() => {
//               addBlock(Buffer.from(text));
//               setText("");
//               setIsFocused(false);
//             }}
//           >
//             add block [text]
//           </StyledButton>
//           <StyledButton
//             onClick={() => {
//               addHash(Buffer.from(text, "hex"));
//               setText("");
//               setIsFocused(false);
//             }}
//           >
//             add hash [hex]
//           </StyledButton>
//         </StyledButtonHorizontalGroup>
//       )}
//     </div>
//   );
// }

// function Connections() {
//   const api = useContext(ApiContext);
//   const cache = useQueryCache();
//   const connectionsQuery = useQuery("connections", api.getConnections);
//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       cache.invalidateQueries("connections");
//     }, 3000);
//     return () => clearInterval(intervalId);
//   }, [cache]);

//   return (
//     <>
//       <StyledHeader
//         css={css`
//           display: flex;
//         `}
//       >
//         <div
//           css={css`
//             flex-grow: 1;
//           `}
//         >
//           connections
//         </div>
//         <div>{connectionsQuery.data?.length}</div>
//       </StyledHeader>
//       <div
//         css={css`
//           width: 100%;
//           height: calc(100% - 21px);
//           overflow: scroll;
//         `}
//       >
//         <pre>{JSON.stringify(connectionsQuery.data, null, 2)}</pre>
//       </div>
//     </>
//   );
// }

// function PreviewBlockAsText({ hash }: { hash: Buffer }) {
//   const api = useContext(ApiContext);
//   const blockQuery = useQuery(
//     ["block", hash.toString("hex")],
//     (k, h: string) => api.getBlockOfHash(Buffer.from(h, "hex")),
//     { staleTime: Infinity }
//   );
//   return (
//     <pre
//       css={css`
//         margin: 0px;
//         font-family: inherit;
//         font-size: inherit;
//         max-width: 150px;
//         overflow: hidden;
//         text-overflow: ellipsis;
//       `}
//     >
//       {blockQuery.data?.toString()}
//     </pre>
//   );
// }
