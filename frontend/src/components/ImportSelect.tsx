import React, { useCallback, useRef, useState } from "react";
import { css } from "styled-components/macro";
import { colors } from "./colors";
import {
  StyledSimpleButton,
  StyledSimpleTextarea,
  StyledSimpleInput,
} from "./ui";
import { useCallbackOnExternalEvent } from "./useCallbackOnExternalEvent";

export function ImportSelect({
  onAddHash,
  onAddBlock,
}: {
  onAddHash(hash: Buffer): void;
  onAddBlock(block: Buffer): void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useCallbackOnExternalEvent(
    containerRef,
    "click",
    useCallback(() => {
      setIsOpen(false);
    }, [])
  );
  const [hashText, setHashText] = useState("");
  const [blockText, setBlockText] = useState("");
  return (
    <div ref={containerRef} css={{ display: "relative" }}>
      <StyledSimpleButton
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        css={css`
          padding-left: 1ch;
          padding-right: 1ch;
        `}
      >
        import
      </StyledSimpleButton>
      {isOpen && (
        <div
          css={css`
            position: absolute;
            width: max-content;
            background-color: ${colors.backgroundDark};
            color: ${colors.white};
            display: grid;
            grid-template-columns: auto auto;
            grid-template-rows: auto auto;
            /* grid-gap: 1ch; */
          `}
        >
          <StyledSimpleButton
            css={css`
              grid-column: 1;
              grid-row: 1;
            `}
            onClick={() => {
              onAddHash(Buffer.from(hashText, "hex"));
              setHashText("");
              setIsOpen(false);
            }}
          >
            hash [hex]
          </StyledSimpleButton>
          <StyledSimpleInput
            value={hashText}
            onChange={(event) => setHashText(event.currentTarget.value)}
            css={css`
              grid-column: 2;
              grid-row: 1;
              width: 100%;
            `}
          />
          <StyledSimpleButton
            css={css`
              grid-column: 1;
              grid-row: 2;
            `}
            onClick={() => {
              onAddBlock(Buffer.from(blockText));
              setBlockText("");
              setIsOpen(false);
            }}
          >
            block [text]
          </StyledSimpleButton>
          <StyledSimpleTextarea
            value={blockText}
            onChange={(event) => setBlockText(event.currentTarget.value)}
            css={css`
              grid-column: 2;
              grid-row: 2;
              height: 400px;
            `}
          />
        </div>
      )}
    </div>
  );
}
