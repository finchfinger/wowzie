import type { Preview } from "@storybook/react-vite";
import "../src/app/globals.css";

// Load Google Sans for Storybook (layout.tsx isn't used here)
if (typeof document !== "undefined") {
  const fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href =
    "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&family=Google+Sans+Text:wght@400;500;700&display=swap";
  document.head.appendChild(fonts);

  const icons = document.createElement("link");
  icons.rel = "stylesheet";
  icons.href =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
  document.head.appendChild(icons);
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;