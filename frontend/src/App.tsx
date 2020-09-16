import React, { useEffect, useState } from "react";
import CBOR from "cbor";

function App() {
  const [state, setState] = useState<any>();
  useEffect(() => {
    api.all().then(console.log);
  }, []);
  return <div></div>;
}

export default App;

var ws = new WebSocket("ws://localhost:8086");
ws.binaryType = "arraybuffer";
ws.addEventListener("message", (event) => {
  const { id, result } = CBOR.decode(Buffer.from(event.data));
  pendingRpcCalls.get(id)?.(result);
  pendingRpcCalls.delete(id);
});
let nextRpcId = 1;
const pendingRpcCalls = new Map<number, (result: any) => void>();
const api: import("../../backend/src").API = new Proxy({} as any, {
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
