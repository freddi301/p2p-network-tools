export type Subscribeable<Value> = {
  subscribe(callback: (value: Value) => void): Subscription;
  publish(value: Value): void;
};
type Subscription = { unsubscribe(): void; isSubscribed: boolean };

export function makeSubscribeable<Value>({
  onSubscribe,
  onUnsubscribe,
}: { onSubscribe?(): void; onUnsubscribe?(): void } = {}): Subscribeable<
  Value
> {
  const subscriptions = new Set<{ callback(value: Value): void }>();
  return {
    subscribe(callback: (value: Value) => void) {
      const subscription = { callback };
      subscriptions.add(subscription);
      let isSubscribed = true;
      if (subscriptions.size === 1) {
        onSubscribe?.();
      }
      return {
        get isSubscribed() {
          return isSubscribed;
        },
        unsubscribe() {
          if (isSubscribed) {
            subscriptions.delete(subscription);
            isSubscribed = false;
            if (subscriptions.size === 0) {
              onUnsubscribe?.();
            }
          } else {
            throw new Error("illegal unsubscribe");
          }
        },
      };
    },
    publish(value: Value) {
      for (const { callback } of subscriptions) {
        callback(value);
      }
    },
  };
}
