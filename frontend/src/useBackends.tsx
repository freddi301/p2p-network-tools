import { useState } from "react";

export function useBackends() {
  const [list, setList] = useState<Array<string>>([
    "localhost:8086",
    "localhost:8087",
  ]);
  const add = (host: string) => {
    if (!list.includes(host)) {
      setList([host, ...list]);
    }
  };
  const remove = (host: string) => {
    setList(list.filter((h) => h !== host));
  };
  return { list, add, remove };
}
