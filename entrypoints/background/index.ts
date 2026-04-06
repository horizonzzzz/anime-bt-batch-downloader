import { defineBackground } from "wxt/utils/define-background"

import { registerBackgroundRuntime } from "../../lib/background/runtime"

export default defineBackground(() => {
  registerBackgroundRuntime()
})
