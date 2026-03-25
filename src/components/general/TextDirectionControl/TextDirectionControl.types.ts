import type { TextDirection } from "../../../types/textDirection";

export interface TextDirectionControlProps {
  value: TextDirection;
  onToggle: () => void;
}
