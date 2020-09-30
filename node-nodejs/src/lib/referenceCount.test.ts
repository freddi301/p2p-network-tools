import { makeReferenceCount } from "./referenceCount";

test("referenceCount", () => {
  let isReferenced = 0;
  let isDropped = 0;
  const rc = makeReferenceCount({
    onAcquired() {
      isReferenced += 1;
    },
    onReleased() {
      isDropped += 1;
    },
  });
  expect(rc.isReferenced).toBe(false);
  const r1 = rc.acquire();
  expect(rc.count).toBe(1);
  expect(isReferenced).toBe(1);
  expect(isDropped).toBe(0);
  const r2 = rc.acquire();
  expect(rc.count).toBe(2);
  expect(rc.isReferenced).toBe(true);
  expect(isReferenced).toBe(1);
  expect(isDropped).toBe(0);
  r2.release();
  expect(rc.count).toBe(1);
  expect(r2.isDropped).toBe(true);
  expect(isReferenced).toBe(1);
  expect(isDropped).toBe(0);
  expect(() => r2.release()).toThrowError();
  r1.release();
  expect(rc.count).toBe(0);
  expect(rc.isReferenced).toBe(false);
  expect(isReferenced).toBe(1);
  expect(isDropped).toBe(1);
  rc.acquire();
  expect(isReferenced).toBe(2);
});
