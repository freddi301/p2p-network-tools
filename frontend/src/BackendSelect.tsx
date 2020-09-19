import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { css } from "styled-components/macro";
import { useCallbackOnExternalEvent } from "./useCallbackOnExternalEvent";
import { ListItem, StyledSimpleAction, StyledSimpleInput } from "./ui";
import { colors } from "./colors";
import { websocketRpcHandles } from "./App";

export function BackendSelect({
  selected,
  list,
  onAdd,
  onRemove,
  onSelect,
}: {
  selected: string;
  list: Array<string>;
  onAdd(backend: string): void;
  onRemove(backend: string): void;
  onSelect(backend: string): void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useCallbackOnExternalEvent(
    containerRef,
    "click",
    useCallback(() => {
      setIsOpen(false);
      setIsAdding(false);
      setText("");
    }, [])
  );
  return (
    <div
      ref={containerRef}
      css={css`
        background-color: ${colors.backgroundDark};
        position: relative;
        width: 200px;
      `}
    >
      <ListItem
        item={
          selected || (
            <span
              css={css`
                color: ${colors.red};
                font-style: italic;
                font-weight: 300;
              `}
            >
              add a backend
            </span>
          )
        }
        actions={
          <StyledSimpleAction
            onClick={() => {
              setIsOpen(true);
              setIsAdding(true);
            }}
            hidden={isAdding}
          >
            +
          </StyledSimpleAction>
        }
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      />
      {isOpen && (
        <div
          css={css`
            position: absolute;
            width: 200px;
          `}
        >
          <StyledSimpleInput
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            ref={inputRef}
            css={css`
              width: 100%;
            `}
            hidden={!isAdding}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onAdd(text);
                onSelect(text);
                setIsOpen(false);
                setIsAdding(false);
                setText("");
              } else if (event.key === "Escape") {
                setIsOpen(false);
                setIsAdding(false);
                setText("");
              }
            }}
          />
          {list.map((backend) => {
            return (
              <ListItem
                key={backend}
                item={backend}
                onClick={() => {
                  onSelect(backend);
                  setIsOpen(false);
                  setIsAdding(false);
                }}
                actions={
                  <>
                    <StyledSimpleAction
                      onClick={() => {
                        onRemove(backend);
                        if (backend === selected) {
                          onSelect(list.filter((b) => b !== backend)[0]);
                        }
                      }}
                    >
                      x
                    </StyledSimpleAction>
                  </>
                }
              >
                <ConnectionStatus backend={backend} />
              </ListItem>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConnectionStatus({ backend }: { backend: string }) {
  const {
    connect,
    disconnect,
    getStatus,
    subscribeStatus,
  } = websocketRpcHandles.get(backend);
  const [status, setStatus] = useState<"closed" | "connecting" | "open">(
    getStatus
  );
  useEffect(() => subscribeStatus(setStatus), [subscribeStatus]);
  return (
    <div
      css={css`
        margin-left: 1ch;
        color: ${connectionColors[status]};
      `}
      onClick={() => {
        if (status === "closed") {
          connect();
        } else {
          disconnect();
        }
      }}
    >
      ⬤
    </div>
  );
}

const connectionColors = {
  closed: colors.red,
  connecting: colors.yellow,
  open: colors.green,
};
