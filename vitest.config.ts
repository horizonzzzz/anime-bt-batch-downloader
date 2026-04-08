import { defineConfig } from "vitest/config"
import { WxtVitest } from "wxt/testing/vitest-plugin"

const plugins = await WxtVitest()

export default defineConfig({
  plugins,
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"]
    }
  }
})
