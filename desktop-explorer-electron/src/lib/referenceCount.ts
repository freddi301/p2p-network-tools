export type ReferenceCount = {
  count: number;
  isReferenced: boolean;
  acquire(): ReferenceInstance;
};
type ReferenceInstance = {
  isDropped: boolean;
  release(): void;
};

export function makeReferenceCount({
  onAcquired,
  onReleased,
}: {
  onAcquired?(): void;
  onReleased?(): void;
} = {}): ReferenceCount {
  let count = 0;
  return {
    get count() {
      return count;
    },
    get isReferenced() {
      return count > 0;
    },
    acquire() {
      count += 1;
      let isDropped = false;
      if (count === 1) onAcquired?.();
      return {
        get isDropped() {
          return isDropped;
        },
        release() {
          if (!isDropped) {
            count -= 1;
            isDropped = true;
            if (count === 0) onReleased?.();
          } else {
            throw new Error("illegal drop");
          }
        },
      };
    },
  };
}
