import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
import styled, { css } from "styled-components/macro";

export default function App() {
  const backends = useBackends();
  const [selectedBackend, setSelectedBackend] = useState(backends.list[0]);
  const allHashesInfo = useAllHashesInfo(selectedBackend);
  return (
    <div
      css={css`
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        display: grid;
        grid-template-rows: [bar] auto [main] auto;
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
              color: ${colors.primary};
            `}
          >
            hash [hex]
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
            size [bytes]
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
            content [text]
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

const colors = {
  background: "#282c34",
  backgroundDark: "#21252b",
  backgroundLight: "#2c313c",
  hoverBackground: "#292d35",
  focusBackground: "#2c313a",
  primary: "#abb2bf",
  comment: "#5c6370",
  blue: "#61afef",
};

function BackendSelect({
  selected,
  list,
  onAdd,
  onRemove,
  onSelect,
}: {
  selected: string;
  list: Array<string>;
  onAdd(backend: string): void;
  onRemove(backend: string): void;
  onSelect(backend: string): void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useCallbackOnExternalEvent(
    containerRef,
    "click",
    useCallback(() => {
      setIsOpen(false);
      setIsAdding(false);
      setText("");
    }, [])
  );
  return (
    <div
      ref={containerRef}
      css={css`
        background-color: ${colors.backgroundDark};
        position: relative;
        width: 200px;
      `}
    >
      <ListItem
        item={selected}
        actions={
          <StyledSimpleAction
            onClick={() => {
              setIsOpen(true);
              setIsAdding(true);
            }}
            hidden={isAdding}
          >
            +
          </StyledSimpleAction>
        }
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      />
      {isOpen && (
        <div
          css={css`
            position: absolute;
            width: 200px;
          `}
        >
          <StyledSimpleInput
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            ref={inputRef}
            css={css`
              width: 100%;
            `}
            hidden={!isAdding}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onAdd(text);
                onSelect(text);
                setIsOpen(false);
                setIsAdding(false);
                setText("");
              } else if (event.key === "Escape") {
                setIsOpen(false);
                setIsAdding(false);
                setText("");
              }
            }}
          />
          {list.map((backend) => {
            return (
              <ListItem
                key={backend}
                item={backend}
                onClick={() => {
                  onSelect(backend);
                  setIsOpen(false);
                  setIsAdding(false);
                }}
                actions={
                  <>
                    <StyledSimpleAction
                      onClick={() => {
                        onRemove(backend);
                      }}
                    >
                      x
                    </StyledSimpleAction>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListItem({
  item,
  actions,
  onClick,
  ...props
}: {
  item: React.ReactNode;
  actions?: React.ReactNode;
} & JSX.IntrinsicElements["div"]) {
  return (
    <div
      css={css`
        cursor: default;
        background-color: ${colors.backgroundDark};
        color: ${colors.primary};
        padding-left: 1ch;
        padding-right: 1ch;
        &:hover {
          background-color: ${colors.hoverBackground};
        }
        display: flex;
        .actions {
          visibility: hidden;
        }
        &:hover {
          .actions {
            visibility: visible;
          }
        }
      `}
      {...props}
    >
      <div
        onClick={onClick}
        css={css`
          flex-grow: 1;
        `}
      >
        {item}
      </div>
      <div className={"actions"}>{actions}</div>
    </div>
  );
}

const StyledSimpleAction = styled.div`
  cursor: default;
  user-select: none;
  color: ${colors.primary};
  &:hover {
    color: ${colors.blue};
  }
`;

const StyledSimpleActionSeparator = styled.div`
  border-right: 1px solid ${colors.background};
`;

const StyledSimpleInput = styled.input`
  font-size: 100%;
  font-family: inherit;
  text-decoration: none;
  color: ${colors.primary};
  padding: 0px 1ch 0px 1ch;
  outline: none;
  background-color: ${colors.backgroundDark};
  border-top: none;
  border-right: none;
  border-bottom: 1px dotted ${colors.comment};
  border-left: none;
  box-sizing: border-box;
  &:focus {
    border-bottom: 1px solid ${colors.blue};
  }
`;

function useBackends() {
  const [list, setList] = useState<Array<string>>([
    "localhost:8086",
    "localhost:8087",
  ]);
  const add = (host: string) => {
    if (!list.includes(host)) {
      setList([host, ...list]);
    }
  };
  const remove = (host: string) => {
    setList(list.filter((h) => h !== host));
  };
  return { list, add, remove };
}

function useAllHashesInfo(
  backend: string
): Array<{ hash: Buffer; size?: number }> {
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
    <div css={{ display: "relative" }}>
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

function useCallbackOnExternalEvent<K extends keyof DocumentEventMap>(
  containerRef: React.MutableRefObject<HTMLElement | null>,
  type: K,
  callback: () => void
) {
  useLayoutEffect(() => {
    const on = (event: Event) => {
      if (containerRef.current) {
        if (!containerRef.current.contains(event.target as any)) {
          callback();
        }
      }
    };
    document.addEventListener(type, on);
    return () => document.removeEventListener(type, on);
  }, [callback, containerRef, type]);
}

// const StyledButton = styled.button`
//   font-size: 100%;
//   font-family: inherit;
//   color: ${colors.primary};
//   padding: 0px 1ch 0px 1ch;
//   text-transform: none;
//   outline: none;
//   background-color: ${colors.backgroundDark};
//   border: none;
//   &:hover {
//     background-color: ${colors.hoverBackground};
//   }
//   &:focus {
//     background-color: ${colors.hoverBackground};
//   }
// `;

// export default function App() {
//   return (
//     <div
//       css={css`
//         background: ${colors.background};
//         color: ${colors.primary};
//         display: grid;
//         grid-template-columns: [lefty] ${showLeftPanel ? "250px" : "0px"} [mid] auto;
//         grid-template-rows: [topper] auto [upper] 1fr [lower] 300px;
//       `}
//     >
//       <div
//         css={css`
//           grid-column: 1 / -1;
//           grid-row: topper;
//         `}
//       >
//         <StyledButtonHorizontalGroup
//           css={css`
//             width: fit-content;
//           `}
//         >
//           <StyledButton
//             onClick={() => {
//               setShowLeftPanel(!showLeftPanel);
//             }}
//           >
//             ⚙
//           </StyledButton>
//         </StyledButtonHorizontalGroup>
//       </div>
//       {showLeftPanel && (
//         <div
//           css={css`
//             grid-column: lefty;
//             grid-row: upper;
//           `}
//         >
//           <Hosts
//             hosts={hosts}
//             onAdd={addHost}
//             onRemove={removeHost}
//             selected={selectedHost}
//             onSelect={setSelectedHost}
//           />
//         </div>
//       )}
//       {hosts.map((host) => {
//         return (
//           <React.Fragment key={host}>
//             <HostContext host={host}>
//               {host === selectedHost && <Control />}
//               <div
//                 css={css`
//                   grid-column: mid;
//                   grid-row: upper / lower;
//                 `}
//                 hidden={host !== selectedHost}
//               >
//                 <Main />
//               </div>
//               {showLeftPanel && (
//                 <div
//                   css={css`
//                     grid-column: lefty;
//                     grid-row: lower;
//                   `}
//                   hidden={host !== selectedHost}
//                 >
//                   <Connections />
//                 </div>
//               )}
//             </HostContext>
//           </React.Fragment>
//         );
//       })}
//     </div>
//   );
// }

// type HostsProps = {
//   hosts: Array<string>;
//   onAdd(host: string): void;
//   onRemove(host: string): void;
//   selected: string | undefined;
//   onSelect(host: string): void;
// };
// function Hosts({ hosts, onAdd, onRemove, selected, onSelect }: HostsProps) {
//   const [text, setText] = useState("localhost:");
//   const add = () => {
//     onAdd(text);
//     setText("localhost:");
//   };
//   return (
//     <div
//       css={css`
//         background-color: ${colors.backgroundDark};
//         height: 100%;
//       `}
//     >
//       <StyledHeader>backends</StyledHeader>
//       <div>
//         <StyledInput
//           value={text}
//           placeholder="localhost:8086"
//           onChange={(event) => setText(event.currentTarget.value)}
//           onKeyDown={(event) => {
//             if (event.key === "Enter") {
//               add();
//             }
//           }}
//           css={css`
//             width: 100%;
//           `}
//         />
//       </div>
//       {hosts.map((host) => {
//         return (
//           <div
//             key={host}
//             css={css`
//               border-left: 1px solid ${colors.background};
//             `}
//           >
//             <StyledButtonDiv
//               onClick={() => onSelect(host)}
//               tabIndex={0}
//               active={host === selected}
//               css={css`
//                 display: flex;
//               `}
//             >
//               <div
//                 css={css`
//                   flex-grow: 1;
//                 `}
//               >
//                 {host}
//               </div>
//               <StyledButtonLink
//                 onClick={() => {
//                   onRemove(host);
//                 }}
//                 css={css`
//                   margin-right: -1ch;
//                 `}
//               >
//                 🗙
//               </StyledButtonLink>
//             </StyledButtonDiv>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// const StyledInput = styled.input`
//   font-size: 100%;
//   font-family: inherit;
//   text-decoration: none;
//   color: inherit;
//   padding: 0px 1ch 0px 1ch;
//   outline: none;
//   background-color: inherit;
//   border-top: none;
//   border-right: none;
//   border-bottom: 1px solid ${colors.comment};
//   border-left: none;
//   box-sizing: border-box;
//   &:focus {
//     background-color: ${colors.background};
//   }
// `;

// const StyledTextArea = styled.textarea`
//   font-size: 100%;
//   font-family: inherit;
//   text-decoration: none;
//   color: inherit;
//   padding: 0px 1ch 0px 1ch;
//   outline: none;
//   background-color: inherit;
//   border-top: none;
//   border-right: 1px solid ${colors.comment};
//   border-left: 1px solid ${colors.comment};
//   border-bottom: none;
//   box-sizing: border-box;
//   &:focus {
//     background-color: ${colors.background};
//   }
// `;

// const StyledButtonDiv = styled.div<{ active: boolean }>`
//   font-size: 100%;
//   font-family: inherit;
//   color: inherit;
//   padding: 0px 1ch 0px 1ch;
//   text-transform: none;
//   outline: none;
//   background-color: ${(props) =>
//     props.active ? colors.hoverBackground : "inherit"};
//   border: none;
//   cursor: default;
//   &:hover {
//     background-color: ${colors.hoverBackground};
//   }
//   &:focus {
//     background-color: ${colors.focusBackground};
//   }
// `;

// const StyledButtonLink = styled.button`
//   font-size: 100%;
//   font-family: inherit;
//   color: ${colors.comment};
//   padding: 0px 1ch 0px 1ch;
//   text-transform: none;
//   outline: none;
//   background-color: inherit;
//   border: none;
//   cursor: default;
//   &:hover {
//     color: ${colors.primary};
//   }
//   &:focus {
//     background-color: ${colors.focusBackground};
//   }
// `;

// const StyledButtonHorizontalGroup = styled.div`
//   background-color: ${colors.backgroundDark};
//   ${StyledButton} {
//     border-right: ${colors.background};
//   }
// `;

// const StyledHeader = styled.div`
//   background-color: ${colors.background};
//   padding: 0px 1ch 0px 1ch;
// `;

// type API = import("../../backend/src").API;
// const ApiContext = React.createContext<API>(null as any);

// function useWebSocketApi(host: string) {
//   const { ws, api } = useMemo(() => {
//     const ws = new WebSocket(`ws://${host}`);
//     ws.binaryType = "arraybuffer";
//     ws.addEventListener("message", (event) => {
//       const { id, result } = CBOR.decode(Buffer.from(event.data));
//       pendingRpcCalls.get(id)?.(result);
//       pendingRpcCalls.delete(id);
//     });
//     let nextRpcId = 1;
//     const pendingRpcCalls = new Map<number, (result: any) => void>();
//     const api: API = new Proxy({} as any, {
//       get(target, method) {
//         return (...params: any[]) =>
//           new Promise((resolve) => {
//             const id = nextRpcId++;
//             pendingRpcCalls.set(id, resolve);
//             const sendit = () => ws.send(CBOR.encode({ id, method, params }));
//             if (ws.readyState === ws.OPEN) {
//               sendit();
//             } else {
//               ws.addEventListener("open", sendit);
//             }
//           });
//       },
//     });
//     return { ws, api };
//   }, [host]);

//   useEffect(
//     () => () => {
//       ws.close();
//     },
//     [ws]
//   );
//   return api;
// }

// function HostContext({
//   host,
//   children,
// }: {
//   host: string;
//   children: React.ReactNode;
// }) {
//   const api = useWebSocketApi(host);
//   const queryCache = useMemo(() => new QueryCache(), [host]);
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
//         {process.env.NODE_ENV === "development" && (
//           <ReactQueryDevtools initialIsOpen />
//         )}
//       </ReactQueryCacheProvider>
//     </ApiContext.Provider>
//   );
// }

// function Main() {
//   const api = useContext(ApiContext);
//   const allHashInfoQuery = useQuery("allHashInfo", api.getAllHashInfo);
//   return (
//     <div
//       css={css`
//         display: flex;
//       `}
//     >
//       <div
//         css={css`
//           flex-grow: 1;
//           padding-left: 1ch;
//           padding-left: 1ch;
//           height: fit-content;
//           display: grid;
//           grid-template-columns: [hash] auto [size] auto [preview] auto;
//           column-gap: 2ch;
//         `}
//         style={{
//           gridTemplateRows: `repeat(${
//             (allHashInfoQuery.data?.length ?? 0) + 1
//           }, [entry] auto [separator] auto)`,
//         }}
//       >
//         <React.Fragment>
//           <div
//             css={css`
//               grid-column: hash;
//               grid-row: entry 1;
//             `}
//           >
//             hash [hex]
//           </div>
//           <div
//             css={css`
//               grid-column: size;
//               grid-row: entry 1;
//             `}
//           >
//             size [bytes]
//           </div>
//           <div
//             css={css`
//               grid-column: preview;
//               grid-row: entry 1;
//             `}
//           >
//             preview [text]
//           </div>
//           <div
//             css={css`
//               grid-column: 1 / -1;
//               grid-row: separator 1;
//               border-bottom: 1px solid ${colors.backgroundLight};
//               margin-top: 4px;
//             `}
//           ></div>
//         </React.Fragment>
//         {allHashInfoQuery.data?.map(({ hash, size }, index) => {
//           const gridRow = `entry ${index + 2}`;
//           return (
//             <React.Fragment key={hash.toString()}>
//               <div
//                 css={css`
//                   grid-column: hash;
//                 `}
//                 style={{ gridRow }}
//               >
//                 {Buffer.prototype.toString.call(hash, "hex")}
//               </div>
//               <div
//                 css={css`
//                   grid-column: size;
//                 `}
//                 style={{ gridRow }}
//               >
//                 {size}
//               </div>
//               <div
//                 css={css`
//                   grid-column: preview;
//                 `}
//                 style={{ gridRow }}
//               >
//                 <PreviewBlockAsText hash={hash} />
//               </div>
//               <div
//                 css={css`
//                   grid-column: 1 / -1;
//                   border-bottom: 1px solid ${colors.backgroundLight};
//                 `}
//                 style={{ gridRow: `separator ${index + 2}` }}
//               ></div>
//             </React.Fragment>
//           );
//         })}
//       </div>
//     </div>
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
