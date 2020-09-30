import { makeReferenceCountedMap } from "./referenceCountedMap";

test("referenceCountedSet", () => {
  const monitor = new Set<string>();
  const rcs = makeReferenceCountedMap<string, string, string>({
    keyMapper(key) {
      return key;
    },
    valueFactory(key) {
      return key + key;
    },
    onAdd(key) {
      monitor.add(key);
    },
    onRemove(key) {
      monitor.delete(key);
    },
  });
  const rci1 = rcs.acquire("a");
  expect(rci1.value).toBe("aa");
  const rci2 = rcs.acquire("b");
  const rci3 = rcs.acquire("b");
  expect(rci3.value).toBe("bb");
  expect(monitor.size).toBe(2);
  rci1.release();
  rci2.release();
  expect(monitor.size).toBe(1);
  rci3.release();
  expect(monitor.size).toBe(0);
});
