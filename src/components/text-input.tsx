import { Text, useInput } from "ink";
import { useEffect, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  placeholder?: string;
}

export function TextInput({ value, onChange, isActive, placeholder }: Props) {
  const [cursor, setCursor] = useState(value.length);

  // External changes (e.g. picking a suggestion) may shrink the value.
  useEffect(() => {
    setCursor((current) => Math.min(current, value.length));
  }, [value]);

  useInput(
    (input, key) => {
      if (key.leftArrow) {
        setCursor(Math.max(0, cursor - 1));
      } else if (key.rightArrow) {
        setCursor(Math.min(value.length, cursor + 1));
      } else if (key.home || (key.ctrl && input === "a")) {
        setCursor(0);
      } else if (key.end || (key.ctrl && input === "e")) {
        setCursor(value.length);
      } else if (key.ctrl && input === "u") {
        onChange("");
        setCursor(0);
      } else if (key.backspace || key.delete) {
        // macOS terminals report Backspace as `delete`, so treat both alike.
        if (cursor === 0) return;
        onChange(value.slice(0, cursor - 1) + value.slice(cursor));
        setCursor(cursor - 1);
      } else if (
        key.ctrl ||
        key.meta ||
        key.escape ||
        key.return ||
        key.tab ||
        key.upArrow ||
        key.downArrow ||
        key.pageUp ||
        key.pageDown ||
        input.length === 0
      ) {
        return;
      } else {
        onChange(value.slice(0, cursor) + input + value.slice(cursor));
        setCursor(cursor + input.length);
      }
    },
    { isActive },
  );

  if (!isActive) {
    return value === "" ? (
      <Text dimColor>{placeholder ?? ""}</Text>
    ) : (
      <Text>{value}</Text>
    );
  }

  return (
    <Text>
      {value.slice(0, cursor)}
      <Text inverse>{value[cursor] ?? " "}</Text>
      {value.slice(cursor + 1)}
      {value === "" && placeholder ? (
        <Text dimColor> {placeholder}</Text>
      ) : null}
    </Text>
  );
}
