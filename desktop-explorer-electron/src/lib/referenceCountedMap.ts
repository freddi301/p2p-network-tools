import { makeReferenceCount, ReferenceCount } from "./referenceCount";

export function makeReferenceCountedMap<Key, Value, MappedKey>({
  keyMapper,
  valueFactory,
  onAdd,
  onRemove,
}: {
  keyMapper(key: Key): MappedKey;
  valueFactory(key: Key): Value;
  onAdd?(key: Key): void;
  onRemove?(key: Key): void;
}) {
  const map = new Map<
    MappedKey,
    { key: Key; value: Value; referenceCount: ReferenceCount }
  >();
  return {
    acquire(key: Key) {
      const mappedKey = keyMapper(key);
      let entry = map.get(mappedKey);
      if (!entry) {
        const referenceCount = makeReferenceCount({
          onReleased() {
            map.delete(mappedKey);
            onRemove?.(key);
          },
        });
        const value = valueFactory(key);
        entry = { key, value, referenceCount };
        map.set(mappedKey, entry);
        onAdd?.(key);
      }
      const { release } = entry.referenceCount.acquire();
      const { value } = entry;
      return {
        value,
        release() {
          release();
        },
      };
    },
    get(key: Key) {
      const mappedKey = keyMapper(key);
      return map.get(mappedKey)?.value;
    },
    has(key: Key) {
      const mappedKey = keyMapper(key);
      return map.has(mappedKey);
    },
    get size() {
      return map.size;
    },
    entries: {
      [Symbol.iterator]: function* () {
        for (const { key, value } of map.values()) {
          yield [key, value] as const;
        }
      },
    },
  };
}
