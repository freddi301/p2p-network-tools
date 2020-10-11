import { Subject } from "./lib/subject";

export type Api<Hash extends HashInterface> = {
  hash: HashStaticInterface<Hash>;
  connectionCount: Subject<number>;
  hashListSubject: Subject<Array<HashInfo<Hash>>>;
  updateHash(
    hash: Hash,
    params: {
      leech: boolean;
      seed: boolean;
      keep: boolean;
      lookup: boolean;
      announce: boolean;
    }
  ): void;
  addDataString(data: string): void;
  addDataBuffer(data: Buffer): void;
};

export type HashStaticInterface<Hash extends HashInterface> = {
  isValidHex(text: string): boolean;
  fromHex(text: string): Hash;
  isValidBuffer(buffer: Buffer): boolean;
  fromBuffer(buffer: Buffer): Hash;
  fromDataString(data: string): Hash;
  fromDataBuffer(data: Buffer): Hash;
};

export type HashInterface = {
  asHexString: string;
  asBuffer: Buffer;
  asRawString: string;
};

export type HashInfo<Hash> = {
  hash: Hash;
  leech: boolean;
  seed: boolean;
  keep: boolean;
  lookup: boolean;
  announce: boolean;
  data: Buffer | undefined;
};
