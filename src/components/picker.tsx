import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useState } from "react";
import { filterByQuery } from "../list";
import { TextInput } from "./text-input";

interface Props<T> {
  value: string;
  onChange: (value: string) => void;
  /** Called with the chosen option, or null when the text is kept as typed. */
  onAccept: (option: T | null) => void;
  options: readonly T[];
  label: (option: T) => string;
  detail?: (option: T) => string;
  isActive: boolean;
  placeholder?: string;
  maxSuggestions?: number;
}

/** Text input with a filtered suggestion list underneath while focused. */
export function Picker<T>({
  value,
  onChange,
  onAccept,
  options,
  label,
  detail,
  isActive,
  placeholder,
  maxSuggestions = 6,
}: Props<T>) {
  // null means the user hasn't moved through the list yet.
  const [highlight, setHighlight] = useState<number | null>(null);

  const suggestions = useMemo(
    () => filterByQuery(options, value, label).slice(0, maxSuggestions),
    [options, value, label, maxSuggestions],
  );

  useEffect(() => {
    setHighlight(null);
  }, [value]);

  useInput(
    (_input, key) => {
      if (suggestions.length === 0) {
        if (key.return) onAccept(null);
        return;
      }
      if (key.downArrow) {
        setHighlight((current) =>
          current === null ? 0 : Math.min(suggestions.length - 1, current + 1),
        );
      } else if (key.upArrow) {
        setHighlight((current) =>
          current === null || current === 0 ? 0 : current - 1,
        );
      } else if (key.return) {
        const chosen =
          highlight !== null
            ? suggestions[highlight]
            : value.trim() === ""
              ? null
              : suggestions[0];
        onAccept(chosen ?? null);
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      <TextInput
        value={value}
        onChange={onChange}
        isActive={isActive}
        placeholder={placeholder}
      />
      {isActive &&
        suggestions.map((option, index) => (
          <Text key={label(option)} inverse={index === highlight}>
            {"  "}
            {label(option)}
            {detail ? <Text dimColor>{`  ${detail(option)}`}</Text> : null}
          </Text>
        ))}
    </Box>
  );
}
