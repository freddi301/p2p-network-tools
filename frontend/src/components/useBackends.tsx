import { useCallback, useState } from "react";
import { connect, disconnect } from "./api";

export function useBackends() {
  const [list, setList] = useState<Array<string>>([]);
  const add = useCallback((host: string) => {
    setList((list) => {
      if (!list.includes(host)) {
        connect(host);
        return [host, ...list];
      }
      return list;
    });
  }, []);
  const remove = (host: string) => {
    disconnect(host);
    setList(list.filter((h) => h !== host));
  };
  return { list, add, remove };
}
