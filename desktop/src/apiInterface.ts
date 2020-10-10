import { Subject } from "./lib/subject";

export type Api<Hash> = {
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
export type ApiShape = Api<any>;

export type HashStaticInterface<Hash> = {
  isValidHex(text: string): boolean;
  fromHex(text: string): Hash;
  toHex(hash: Hash): string;
  isValidBuffer(buffer: Buffer): boolean;
  toBuffer(hash: Hash): Buffer;
  fromBuffer(buffer: Buffer): Hash;
  fromDataString(data: string): Hash;
  fromDataBuffer(data: Buffer): Hash;
  toRawString(hash: Hash): string;
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
