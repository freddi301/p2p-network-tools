import React, { useState } from "react";
import ReactDOM from "react-dom";
import { css, injectGlobal } from "emotion";
import { Hash } from "p2p-network-tools-node-nodejs";
import { ipcRenderer } from "electron";
import { colors } from "./colors";
import { buttonStyle } from "./common-ui";
import { ShareText } from "./ShareText";
import { VideoConference } from "./VideoConference";

export type Props = {
  subscribeBlock(
    hash: Hash,
    onBlock: (block: Buffer) => void
  ): { unsubscribe(): void };
  provideBlock(block: Buffer): void;
};

export function start(props: Props) {
  ReactDOM.render(
    <React.StrictMode>
      <App {...props} />
    </React.StrictMode>,
    document.getElementById("root")
  );
}

function App(props: Props) {
  const [SubApp, setSubApp] = useState<React.ComponentType<Props>>(
    () => VideoConference
  );
  return (
    <>
      <div
        className={css`
          display: flex;
          background-color: ${colors.backgroundDark};
          font-family: "Fira Code", monospace;
          color: ${colors.white};
        `}
      >
        <div
          className={buttonStyle}
          onClick={() => {
            setSubApp(() => ShareText);
          }}
        >
          share text
        </div>
        <div
          className={buttonStyle}
          onClick={() => {
            setSubApp(() => VideoConference);
          }}
        >
          video conference
        </div>
        <div
          className={css`
            flex-grow: 1;
            -webkit-app-region: drag;
          `}
        ></div>
        <div
          onClick={() => {
            ipcRenderer.send("app:quit");
          }}
          className={`${buttonStyle} ${css`
            color: ${colors.red};
          `}`}
        >
          exit
        </div>
      </div>
      <div hidden={SubApp !== ShareText}>
        <ShareText {...props} />
      </div>
      <div hidden={SubApp !== VideoConference}>
        <VideoConference />
      </div>
    </>
  );
}

injectGlobal`
  body {
    margin: 0;
  }
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400&display=swap');
  ::-webkit-scrollbar {
    background-color: ${colors.backgroundDark};
    width: 6px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: ${colors.backgroundFocus}
  }
  ::-webkit-scrollbar-corner {
    background-color: ${colors.backgroundDark};
  }
`;
