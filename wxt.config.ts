import { defineConfig } from "wxt"

import { CONTENT_SCRIPT_MATCH_PATTERNS } from "./src/lib/sources/matching"

export default defineConfig({
  browser: "chrome",
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  outDir: "build",
  outDirTemplate: "chrome-mv3-prod",
  vite: () => ({
    optimizeDeps: {
      entries: [
        "src/entrypoints/options/index.html",
        "src/entrypoints/popup/index.html",
        "!build/**",
        "!tests/e2e/fixtures/**"
      ]
    }
  }),
  manifest: {
    name: "Anime BT Batch",
    description:
      "Select posts from supported anime BT source pages, resolve real download links, and send them to qBittorrent in one batch.",
    minimum_chrome_version: "114",
    permissions: ["storage", "tabs", "scripting"],
    host_permissions: [
      "http://www.kisssub.org/*",
      "https://www.kisssub.org/*",
      "http://*/*",
      "https://*/*"
    ],
    icons: {
      16: "/icon.png",
      32: "/icon.png",
      48: "/icon.png",
      64: "/icon.png",
      128: "/icon.png"
    },
    action: {
      default_title: "Anime BT Batch",
      default_popup: "popup.html",
      default_icon: {
        16: "/icon.png",
        32: "/icon.png"
      }
    },
    web_accessible_resources: [
      {
        resources: ["content-scripts/source-batch.css"],
        matches: CONTENT_SCRIPT_MATCH_PATTERNS,
        use_dynamic_url: true
      }
    ],
    options_ui: {
      page: "options.html",
      open_in_tab: true
    }
  }
})
