import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OptionsPage } from "../../components/options-page"

const settings = {
  qbBaseUrl: "http://127.0.0.1:17474",
  qbUsername: "admin",
  qbPassword: "123456",
  concurrency: 1,
  injectTimeoutMs: 15000,
  domSettleMs: 1200,
  retryCount: 1,
  remoteScriptUrl: "//1.acgscript.com/script/miobt/4.js?3",
  remoteScriptRevision: "20181120.2",
  lastSavePath: ""
}

describe("OptionsPage", () => {
  it("does not show local helper installation guidance", async () => {
    const api = {
      loadSettings: vi.fn().mockResolvedValue(settings),
      saveSettings: vi.fn(),
      testConnection: vi.fn()
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(screen.queryByText("本地目录助手")).not.toBeInTheDocument()
  })

  it("loads settings on mount and saves edited values", async () => {
    const user = userEvent.setup()
    const api = {
      loadSettings: vi.fn().mockResolvedValue(settings),
      saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings),
      testConnection: vi.fn()
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    const usernameField = screen.getByLabelText("用户名")
    await user.clear(usernameField)
    await user.type(usernameField, "operator")
    await user.click(screen.getByRole("button", { name: "保存设置" }))

    await waitFor(() => {
      expect(api.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          qbUsername: "operator"
        })
      )
    })

    expect(screen.getByRole("status")).toHaveTextContent("设置已保存。")
  })

  it("shows a live status region and connection feedback while testing", async () => {
    const user = userEvent.setup()
    let resolveConnection: ((value: { baseUrl: string; version: string }) => void) | undefined
    const api = {
      loadSettings: vi.fn().mockResolvedValue(settings),
      saveSettings: vi.fn(),
      testConnection: vi.fn().mockImplementation(
        () =>
          new Promise<{ baseUrl: string; version: string }>((resolve) => {
            resolveConnection = resolve
          })
      )
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("status")).toHaveTextContent("设置已加载。")

    await user.click(screen.getByRole("button", { name: "测试 qB 连接" }))

    expect(api.testConnection).toHaveBeenCalledWith(settings)
    expect(screen.getByRole("button", { name: "测试 qB 连接" })).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent("正在测试连接。")

    resolveConnection?.({
      baseUrl: settings.qbBaseUrl,
      version: "5.0.0"
    })

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("连接成功。")
      expect(screen.getByRole("status")).toHaveTextContent("5.0.0")
    })
  })
})
