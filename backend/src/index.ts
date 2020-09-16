import CBOR from "cbor";
import WebSocket from "ws";
import http from "http";

const port = 8086;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const { id, method, params } = CBOR.decode(message as Buffer);
    // @ts-ignore
    api[method](...params).then((result) => {
      console.log(CBOR.encode({ id, result }));
      ws.send(CBOR.encode({ id, result }));
    });
  });
});
server.listen(port);

export type API = typeof api;
const api = {
  async all() {
    return [{ hash: Buffer.from("hello"), block: Buffer.from("world") }];
  },
};
