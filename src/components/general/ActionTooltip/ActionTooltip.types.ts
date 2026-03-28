export type ActionTooltipPlacement = "top";

export interface ActionTooltipProps {
  id?: string;
  label: string;
  visible: boolean;
  placement?: ActionTooltipPlacement;
}
