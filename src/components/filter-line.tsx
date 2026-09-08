import { Text } from "ink";
import { TextInput } from "./text-input";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  matches: number;
  total: number;
}

/** The live filter shown above a list while `/` is in use. */
export function FilterLine({
  value,
  onChange,
  isActive,
  matches,
  total,
}: Props) {
  return (
    <Text>
      <Text color="yellow">/ </Text>
      <TextInput value={value} onChange={onChange} isActive={isActive} />
      <Text dimColor>
        {"  "}
        {matches} of {total}
        {isActive ? " · Enter keep · Esc clear" : ""}
      </Text>
    </Text>
  );
}
