import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";
import { fileURLToPath } from "url";

// __dirname is not available in ESM — derive it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
  ],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    // Resolve the @/ path alias used throughout the project
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      "@": path.resolve(__dirname, "../src"),
    };
    return config;
  },
};

export default config;