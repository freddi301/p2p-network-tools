import { css } from "emotion";
import { colors } from "./colors";

export const buttonStyle = css`
  background-color: ${colors.backgroundDark};
  color: ${colors.white};
  padding: 0.5em;
  user-select: none;
  cursor: default;
  &:hover {
    background-color: ${colors.backgroundHover};
  }
  transition: 0.3ms;
`;
