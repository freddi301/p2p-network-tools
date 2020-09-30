export function makePromiseable<Value>() {
  let state: { type: "unresolved" } | { type: "resolved"; value: Value } = {
    type: "unresolved",
  };
  const subscriptions = new Set<{ callback(value: Value): void }>();
  return {
    subscribe(callback: (value: Value) => void) {
      switch (state.type) {
        case "resolved": {
          callback(state.value);
          break;
        }
        case "unresolved": {
          const subscription = { callback };
          subscriptions.add(subscription);
          break;
        }
      }
    },
    get state() {
      return state as Readonly<typeof state>;
    },
    resolve(value: Value) {
      switch (state.type) {
        case "resolved": {
          throw new Error("illegal resolve");
        }
        case "unresolved": {
          state = { type: "resolved", value };
          for (const subscription of subscriptions) {
            const { callback } = subscription;
            callback(value);
            subscriptions.delete(subscription);
          }
        }
      }
    },
  };
}
