import React, { useEffect, useRef, useState } from "react";
// @ts-ignore
import hyperswarm from "hyperswarm";
import { hashFromBlock } from "p2p-network-tools-node-nodejs";
import { buttonStyle } from "./common-ui";
import { css } from "emotion";
import { colors } from "./colors";

declare var MediaRecorder: any;
const mimeType = "video/webm; codecs=vp9";
let forceRefresh = () => {};

export function VideoConference() {
  const [, forceRerender] = useState(0);
  useEffect(() => {
    forceRefresh = () => forceRerender((c) => c + 1);
  }, []);
  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (myVideoRef.current) {
        switch (webcamController.state.type) {
          case "started": {
            if (
              myVideoRef.current.srcObject !==
              webcamController.state.mediaStream
            ) {
              myVideoRef.current.srcObject = webcamController.state.mediaStream;
            }
            break;
          }
          case "stopped": {
            if (myVideoRef.current.srcObject) {
              myVideoRef.current.srcObject = null;
            }
            break;
          }
        }
      }
    }, 200);
    return () => clearInterval(intervalId);
  }, []);
  return (
    <div
      className={css`
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      `}
    >
      <div>
        <div
          className={css`
            border: 2px solid ${colors.blue};
            border-radius: 4px;
            margin: 1em;
          `}
        >
          <video
            width={320}
            height={240}
            ref={myVideoRef}
            autoPlay={true}
            controls={true}
          />
          <div
            className={css`
              display: flex;
            `}
          >
            <div
              onClick={() => {
                webcamController.start();
              }}
              className={buttonStyle}
            >
              start
            </div>
            <div
              onClick={() => {
                webcamController.stop();
              }}
              className={buttonStyle}
            >
              stop
            </div>
          </div>
        </div>
      </div>
      {videoConnections.map(({ objectUrl, close }) => {
        return (
          <div
            key={objectUrl}
            className={css`
              border: 2px solid ${colors.blue};
              border-radius: 4px;
              margin: 0.5em;
            `}
          >
            <video
              src={objectUrl}
              autoPlay={true}
              controls={true}
              width={320}
              height={240}
            />
            <div
              className={css`
                display: flex;
              `}
            >
              <div className={buttonStyle} onClick={close}>
                close
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const sendTos = new Set<(data: ArrayBuffer) => void>();
const webcamController = makeWebcamController({
  onData(data) {
    for (const onData of sendTos) {
      onData(data);
    }
  },
});
let videoConnections: Array<{ objectUrl: string; close(): void }> = [];

function makeWebcamController({ onData }: { onData(data: ArrayBuffer): void }) {
  let state:
    | { type: "stopped" }
    | { type: "starting" }
    | { type: "started"; mediaStream: MediaStream } = {
    type: "stopped",
  };
  return {
    get state() {
      return state;
    },
    start() {
      if (state.type !== "stopped") throw new Error();
      state = { type: "starting" };
      navigator.getUserMedia(
        {
          video: { width: { exact: 640 }, height: { exact: 480 } },
          audio: false,
        },
        (mediaStream) => {
          const recorder = new MediaRecorder(mediaStream, {
            mimeType,
          });
          recorder.start(25);
          recorder.ondataavailable = (event: any) => {
            if (event.data.size) {
              const blob = event.data;
              blob.arrayBuffer().then(onData);
            }
          };
          state = { type: "started", mediaStream };
        },
        () => {
          state = { type: "stopped" };
        }
      );
    },
    stop() {
      if (state.type !== "started") throw new Error();
      const { mediaStream } = state;
      mediaStream.getTracks().forEach(function (track) {
        track.stop();
      });
      state = { type: "stopped" };
    },
  };
}

const swarm = hyperswarm({ queue: { multiplex: true } });

swarm.join(hashFromBlock(Buffer.from("videoconference with frederik")), {
  lookup: true,
  announce: true,
});

swarm.on("connection", (socket: any, info: any) => {
  const onData = (data: ArrayBuffer) => {
    socket.write(Buffer.from(data));
  };
  sendTos.add(onData);
  let onMore = () => {};
  const queue: Array<Buffer> = [];
  socket.on("data", (data: Buffer) => {
    queue.push(data);
    onMore();
  });
  const mediaSource = new MediaSource();
  mediaSource.onsourceopen = () => {
    console.log("onsourceopen");
    mediaSource.duration = 1;
    const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
    // sourceBuffer.onupdate = () => console.log("onupdate");
    // sourceBuffer.onupdatestart = () => console.log("onupdatestart");
    sourceBuffer.onupdateend = () => {
      const next = queue.shift();
      if (next && mediaSource.readyState === "open") {
        sourceBuffer.appendBuffer(next);
      }
    };
    onMore = () => {
      if (!sourceBuffer.updating) {
        const next = queue.shift();
        if (next) {
          sourceBuffer.appendBuffer(next);
        }
      }
    };
  };
  mediaSource.onsourceended = () => {
    console.log("onsourceended");
  };
  mediaSource.onsourceclose = () => {
    console.log("onsourceclose");
    onMore = () => {};
  };
  const objectUrl = URL.createObjectURL(mediaSource);
  videoConnections = [
    ...videoConnections,
    {
      objectUrl,
      close() {
        socket.end();
        info.backoff();
        info.ban();
      },
    },
  ];
  forceRefresh();
  const clean = () => {
    videoConnections = videoConnections.filter(
      (ou) => ou.objectUrl !== objectUrl
    );
    forceRefresh();
    sendTos.delete(onData);
    URL.revokeObjectURL(objectUrl);
  };
  socket.on("close", clean);
  socket.on("error", clean);
});
