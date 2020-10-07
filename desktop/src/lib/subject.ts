import { useEffect, useState } from "react";

export type Subject<Value> = {
  readonly value: Value;
  readonly publish: (value: Value) => void;
  readonly subscribe: (subscriber: Subscriber<Value>) => Subscription<Value>;
  readonly hasSubscriptions: boolean;
};

export type Subscriber<Value> = (value: Value) => Teardown;
type Teardown = (() => void) | void;

export type Subscription<Value> = {
  readonly isSubscribed: boolean;
  readonly unsubscribe: () => void;
  readonly subject: Subject<Value>;
};

export function Subject<Value>({
  initial,
  onHasReferences,
}: {
  initial: Value;
  onHasReferences?(): undefined;
}) {
  let currentValue = initial;
  const subscriptions = new Set<{
    subscriber: Subscriber<Value>;
    tearDown: Teardown;
  }>();
  let onHasReferencesTeardown: Teardown;
  const subject: Subject<Value> = {
    get value() {
      return currentValue;
    },
    subscribe(subscriber: Subscriber<Value>) {
      if (subscriptions.size === 0) {
        onHasReferencesTeardown = onHasReferences?.();
      }
      const tearDown = subscriber(currentValue);
      const subscription = { subscriber, tearDown };
      subscriptions.add(subscription);
      let isSubscribed = true;
      return {
        get subject() {
          return subject;
        },
        get isSubscribed() {
          return isSubscribed;
        },
        unsubscribe() {
          if (isSubscribed) {
            if (subscription.tearDown) subscription.tearDown();
            subscriptions.delete(subscription);
            if (subscriptions.size === 0) {
              if (onHasReferencesTeardown) onHasReferencesTeardown();
            }
          } else {
            throw new Error("illegal unsubscribe");
          }
        },
      };
    },
    publish(value: Value) {
      currentValue = value;
      for (const subscription of subscriptions) {
        if (subscription.tearDown) subscription.tearDown();
        subscription.tearDown = subscription.subscriber(value);
      }
    },
    get hasSubscriptions() {
      return subscriptions.size > 0;
    },
  };
  return subject;
}

export function useSubject<Value>(subject: Subject<Value>) {
  const [value, setValue] = useState(() => subject.value);
  useEffect(() => {
    const { unsubscribe } = subject.subscribe((value) => setValue(() => value));
    return unsubscribe;
  }, [subject]);
  return value;
}
