import CBOR from "cbor";
import WebSocket from "ws";
import http from "http";
import { api } from "./node";

const port = process.env.PORT || 8086;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const { id, method, params } = CBOR.decode(message as Buffer);
    // @ts-ignore
    api[method](...params).then((result) => {
      ws.send(CBOR.encode({ id, result }));
    });
  });
});
server.listen(port, () => {
  console.log(`localhost:${port}`);
});
