import React from "react";
import styled, { css } from "styled-components/macro";
import { colors } from "./colors";

export function ListItem({
  item,
  actions,
  onClick,
  children,
  ...props
}: {
  item: React.ReactNode;
  actions?: React.ReactNode;
} & JSX.IntrinsicElements["div"]) {
  return (
    <div
      css={css`
        cursor: default;
        background-color: ${colors.backgroundDark};
        color: ${colors.white};
        padding-left: 1ch;
        padding-right: 1ch;
        &:hover {
          background-color: ${colors.backgroundHover};
        }
        display: flex;
        .actions {
          visibility: hidden;
        }
        &:hover {
          .actions {
            visibility: visible;
          }
        }
      `}
      {...props}
    >
      <div
        onClick={onClick}
        css={css`
          flex-grow: 1;
        `}
      >
        {item}
      </div>
      <div className={"actions"}>{actions}</div>
      {children}
    </div>
  );
}

export const StyledSimpleAction = styled.div`
  cursor: default;
  user-select: none;
  color: ${colors.white};
  &:hover {
    color: ${colors.blue};
  }
`;

export const StyledSimpleButton = styled.div`
  cursor: default;
  background-color: ${colors.backgroundDark};
  color: ${colors.white};
  padding-left: 1ch;
  padding-right: 1ch;
  &:hover {
    background-color: ${colors.backgroundHover};
  }
`;

export const StyledSimpleActionSeparator = styled.div`
  border-right: 1px solid ${colors.background};
`;

export const StyledSimpleInput = styled.input`
  font-size: 100%;
  font-family: inherit;
  text-decoration: none;
  color: ${colors.white};
  padding: 0px 1ch 0px 1ch;
  outline: none;
  background-color: ${colors.backgroundDark};
  border-top: none;
  border-right: none;
  border-bottom: 1px dotted ${colors.gray};
  border-left: none;
  box-sizing: border-box;
  &:focus {
    border-bottom: 1px solid ${colors.blue};
  }
`;

export const StyledSimpleTextarea = styled.textarea`
  font-size: 100%;
  font-family: inherit;
  text-decoration: none;
  color: ${colors.white};
  padding: 0px 1ch 0px 1ch;
  outline: none;
  background-color: ${colors.backgroundDark};
  border-top: none;
  border-right: none;
  border-bottom: 1px dotted ${colors.gray};
  border-left: 1px dotted ${colors.gray};
  box-sizing: border-box;
  &:focus {
    border-bottom: 1px solid ${colors.blue};
  }
`;

// const StyledButton = styled.button`
//   font-size: 100%;
//   font-family: inherit;
//   color: ${colors.primary};
//   padding: 0px 1ch 0px 1ch;
//   text-transform: none;
//   outline: none;
//   background-color: ${colors.backgroundDark};
//   border: none;
//   &:hover {
//     background-color: ${colors.hoverBackground};
//   }
//   &:focus {
//     background-color: ${colors.hoverBackground};
//   }
// `;
