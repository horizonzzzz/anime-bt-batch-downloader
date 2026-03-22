import { describe, expect, it } from "vitest"

import { getQbLoginErrorMessage } from "../../lib/qb"

describe("getQbLoginErrorMessage", () => {
  it("returns actionable guidance for 401 responses", () => {
    expect(
      getQbLoginErrorMessage(401, {
        qbBaseUrl: "http://127.0.0.1:17474"
      })
    ).toContain("Enable Cross-Site Request Forgery (CSRF) protection")
  })

  it("falls back to the generic HTTP status message", () => {
    expect(
      getQbLoginErrorMessage(403, {
        qbBaseUrl: "http://127.0.0.1:17474"
      })
    ).toBe("qBittorrent login failed with HTTP 403.")
  })
})
