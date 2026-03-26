import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ToolbarIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  label: string;
  icon: ReactNode;
}
