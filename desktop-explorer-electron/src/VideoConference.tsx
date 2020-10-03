import React, { useEffect, useRef } from "react";
// @ts-ignore
import hyperswarm from "hyperswarm";
import { hashFromBlock } from "p2p-network-tools-node-nodejs";

declare var MediaRecorder: any;
const mimeType = "video/webm; codecs=vp9";

export function VideoConference() {
  const myVideoRef = useRef<HTMLVideoElement | null>(null);
  const mirrorVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const me = myVideoRef.current;
    const mirror = mirrorVideoRef.current;
    if (me && mirror) {
      navigator.getUserMedia(
        {
          video: { width: { exact: 640 }, height: { exact: 480 } },
          audio: false,
        },
        (myWebcamMediaStream) => {
          me.srcObject = myWebcamMediaStream;
          me.autoplay = true;
          let onData: ((data: ArrayBuffer) => void) | null = null;
          const recorder = new MediaRecorder(myWebcamMediaStream, {
            mimeType,
          });
          recorder.start(16);
          recorder.ondataavailable = (event: any) => {
            if (event.data.size) {
              const blob = event.data;
              blob.arrayBuffer().then((data: ArrayBuffer) => {
                onData?.(data);
              });
            }
          };
          const mediaSource = new MediaSource();
          mirror.src = URL.createObjectURL(mediaSource);
          mirror.autoplay = true;
          mediaSource.addEventListener("sourceopen", () => {
            const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            onData = (data: ArrayBuffer) => {
              sourceBuffer.appendBuffer(data);
            };
          });
        },
        () => {}
      );
    }
  }, []);
  return (
    <div>
      <video ref={myVideoRef} />
      <video ref={mirrorVideoRef} />
    </div>
  );
}

function u() {
  let state:
    | { type: "stopped" }
    | { type: "starting" }
    | { type: "started"; mediaStream: MediaStream } = { type: "stopped" };
  function onData(data: ArrayBuffer) {
    // do something
  }
  return {
    start() {
      state = { type: "starting" };
      navigator.getUserMedia(
        {
          video: { width: { exact: 640 }, height: { exact: 480 } },
          audio: false,
        },
        (mediaStream) => {
          state = { type: "started", mediaStream };
          const recorder = new MediaRecorder(mediaStream, {
            mimeType,
          });
          recorder.start(20);
          recorder.ondataavailable = (event: any) => {
            if (event.data.size) {
              const blob = event.data;
              blob.arrayBuffer().then(onData);
            }
          };
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

// const swarm = hyperswarm({ queue: { multiplex: true } });

// swarm.join(hashFromBlock(Buffer.from("videoconference")));

// swarm.on("connection", (socket: any) => {
//   // send stream
//   // show stream
//   socket.on("data");
//   socket.on("close", () => {});
//   socket.on("error", () => {});
// });
