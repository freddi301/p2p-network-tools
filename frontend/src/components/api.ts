import CBOR from "cbor";

export type API = import("../../../backend/src").API;

const websockets = new Map<string, WebSocket>();
let nextRpcId = 1;
const pending = new Map<
  number,
  { resolve(value: any): void; reject(error?: any): void }
>();

export function rpc<M extends keyof API>(
  backend: string,
  method: M,
  ...params: Parameters<API[M]>
): ReturnType<API[M]> {
  return new Promise((resolve, reject) => {
    const ws = websockets.get(backend);
    if (!ws) return reject();
    if (ws.readyState !== ws.OPEN) return reject();
    const id = nextRpcId++;
    pending.set(id, { resolve, reject });
    ws.send(CBOR.encode({ id, method, params }));
    setTimeout(() => {
      reject();
      pending.delete(id);
    }, 1 * 60 * 1000);
  }) as any;
}

export function connect(backend: string) {
  disconnect(backend);
  const ws = new WebSocket(`ws://${backend}`);
  ws.binaryType = "arraybuffer";
  ws.addEventListener("message", (event) => {
    const { id, result } = CBOR.decode(Buffer.from(event.data));
    pending.get(id)?.resolve(result);
    pending.delete(id);
  });
  websockets.set(backend, ws);
}

export function disconnect(backend: string) {
  const ws = websockets.get(backend);
  ws?.close();
}
