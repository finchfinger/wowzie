// .storybook/preview.ts
import type { Preview } from "@storybook/react-vite";

// IMPORTANT: load the same global CSS you use in your app (Tailwind, fonts, etc).
// If your file is named differently, change this path to match.
// Common options: "../src/index.css" or "../src/main.css"
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Make Canvas match your app’s default page background
    backgrounds: {
      default: "app",
      values: [{ name: "app", value: "#f3f4f6" }], // tailwind gray-100
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
