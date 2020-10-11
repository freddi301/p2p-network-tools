import { css, injectGlobal } from "emotion";
import React from "react";
import ReactDOM from "react-dom";
import { ipcRenderer } from "electron";
import { useState } from "react";
import { useSubject } from "../lib/subject";
import { ApiShape } from "../apiInterface";

export function startGui<Api extends ApiShape>(api: Api) {
  ReactDOM.render(
    <React.StrictMode>
      <App api={api} />
    </React.StrictMode>,
    document.getElementById("root")
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

const fonts = {
  sans: `Ubuntu, Arial, Helvetica, sans-serif`,
  mono: `Ubuntu Monospace, monospace`,
};

injectGlobal`
  body {
    margin: 0;
  }
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap');
`;

function App<Api extends ApiShape>({ api }: { api: Api }) {
  const [text, setText] = useState("");
  const hashList = useSubject(api.hashListSubject);
  const connections = useSubject(api.connectionCount);
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
        {api.hash.isValidHex(text) && (
          <div>
            <div
              onClick={() => {
                api.updateHash(api.hash.fromHex(text), {
                  leech: false,
                  seed: false,
                  keep: false,
                  lookup: false,
                  announce: false,
                });
                setText("");
              }}
              className={buttonStyle}
            >
              add
            </div>
          </div>
        )}
        <HashOfText api={api} />
        <div>connections: {connections}</div>
        <div>
          {hashList.map((hashInfo) => {
            const { hash } = hashInfo;
            return (
              <div key={hash.byteString}>
                <div
                  className={css`
                    font-family: ${fonts.mono};
                  `}
                >
                  {hash.hexString}
                </div>
                <div
                  className={css`
                    display: flex;
                  `}
                >
                  <div
                    onClick={() => {
                      api.updateHash(hash, {
                        ...hashInfo,
                        leech: !hashInfo.leech,
                      });
                    }}
                    className={toggleStyle(hashInfo.leech)}
                  >
                    leech
                  </div>
                  <div
                    onClick={() => {
                      api.updateHash(hash, {
                        ...hashInfo,
                        seed: !hashInfo.seed,
                      });
                    }}
                    className={toggleStyle(hashInfo.seed)}
                  >
                    seed
                  </div>
                  <div
                    onClick={() => {
                      api.updateHash(hash, {
                        ...hashInfo,
                        keep: !hashInfo.keep,
                      });
                    }}
                    className={toggleStyle(hashInfo.keep)}
                  >
                    keep
                  </div>{" "}
                  <div
                    onClick={() => {
                      api.updateHash(hash, {
                        ...hashInfo,
                        lookup: !hashInfo.lookup,
                      });
                    }}
                    className={toggleStyle(hashInfo.lookup)}
                  >
                    lookup
                  </div>
                  <div
                    onClick={() => {
                      api.updateHash(hash, {
                        ...hashInfo,
                        announce: !hashInfo.announce,
                      });
                    }}
                    className={toggleStyle(hashInfo.announce)}
                  >
                    announce
                  </div>
                  <div>{hashInfo.data && hashInfo.data.toString()}</div>
                </div>
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

function HashOfText<Api extends ApiShape>({ api }: { api: Api }) {
  const [text, setText] = useState("");
  const hash = api.hash.fromDataString(text);
  return (
    <div>
      <div>{api.hash.toHex(hash)}</div>
      <div
        onClick={() => {
          api.addDataBuffer(Buffer.from(text));
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
