import { Box, Text } from "ink";

const SECTIONS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Everywhere",
    keys: [
      ["q", "quit"],
      ["s", "sync with server"],
      ["?", "toggle this help"],
    ],
  },
  {
    title: "Lists",
    keys: [
      ["j / k, ↑ / ↓", "move selection"],
      ["g / G", "jump to top / bottom"],
      ["PgUp / PgDn", "move a page"],
      ["/", "filter the list as you type"],
      ["Enter, Space", "open account"],
      ["Esc, h, ←", "back (Esc clears a filter first)"],
    ],
  },
  {
    title: "Transactions",
    keys: [
      ["c", "toggle cleared"],
      ["a", "add transaction"],
      ["e", "edit transaction"],
      ["d", "delete transaction (asks y/N)"],
    ],
  },
  {
    title: "Add / edit transaction",
    keys: [
      ["Tab / Shift+Tab", "next / previous field"],
      ["↑ / ↓", "move through suggestions"],
      ["Enter", "accept field, save on the last one"],
      ["Ctrl+S", "save"],
      ["Esc", "cancel"],
    ],
  },
];

export function HelpOverlay() {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Keyboard reference</Text>
      {SECTIONS.map((section) => (
        <Box key={section.title} flexDirection="column" marginTop={1}>
          <Text underline>{section.title}</Text>
          {section.keys.map(([key, description]) => (
            <Text key={key}>
              <Text color="cyan">{key.padEnd(18)}</Text>
              {description}
            </Text>
          ))}
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}
