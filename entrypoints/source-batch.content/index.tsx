import { defineContentScript } from "wxt/utils/define-content-script"

import "../../styles/content.css"

import { startSourceBatchContentScript } from "../../contents/source-batch"
import { CONTENT_SCRIPT_MATCH_PATTERNS } from "../../lib/sources/matching"

export default defineContentScript({
  matches: CONTENT_SCRIPT_MATCH_PATTERNS,
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    await startSourceBatchContentScript(ctx)
  }
})
