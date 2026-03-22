import { useEffect, useMemo, useState } from "react"

import { DEFAULT_SETTINGS } from "../lib/settings"
import type { Settings, TestQbConnectionResult } from "../lib/types"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

export function OptionsPage({ api }: OptionsPageProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState("正在读取已保存设置。")
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    void api
      .loadSettings()
      .then((loaded) => {
        setSettings(loaded)
        setStatus("设置已加载。")
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "无法读取设置。")
      })
  }, [api])

  const compatibilityNote = useMemo(
    () => (
      <>
        <strong>qB WebUI 兼容提示</strong>
        <p>
          该扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:17474</code> 这类本机 WebUI。若测试连接返回
          401，而账号密码确认无误，请在 qBittorrent 的 <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
          <code>Enable Cross-Site Request Forgery (CSRF) protection</code> 后重试。
        </p>
        <p>
          如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在 WebUI
          只供本机使用时这样配置，不建议暴露到局域网或公网。
        </p>
      </>
    ),
    []
  )

  const updateField = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: value
    }))
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("正在保存设置。")

    try {
      const saved = await api.saveSettings(settings)
      setSettings(saved)
      setStatus("设置已保存。")
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "保存失败。")
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setStatus("正在测试 qBittorrent 连接。")

    try {
      const result = await api.testConnection(settings)
      setStatus(`连接成功。${result.baseUrl || ""} 版本 ${result.version || "unknown"}`)
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "连接测试失败。")
    } finally {
      setTesting(false)
    }
  }

  return (
    <main className="settings-page">
      <section className="settings-card">
        <header className="settings-card__header">
          <div>
            <p className="eyebrow">Kisssub Batch Downloader</p>
            <h1>设置</h1>
          </div>
          <p className="lead">
            配置 qBittorrent WebUI、详情页注入超时和并发数。扩展会在 Kisssub 详情页自动注入
            acgscript，再批量提交真实链接。
          </p>
          <aside className="compatibility-note">{compatibilityNote}</aside>
        </header>

        <form className="settings-form" onSubmit={handleSave}>
          <label>
            <span>qBittorrent WebUI 地址</span>
            <input
              type="url"
              name="qbBaseUrl"
              value={settings.qbBaseUrl}
              placeholder="http://127.0.0.1:8080"
              onChange={(event) => updateField("qbBaseUrl", event.currentTarget.value)}
              required
            />
          </label>

          <label>
            <span>用户名</span>
            <input
              type="text"
              name="qbUsername"
              value={settings.qbUsername}
              placeholder="admin"
              onChange={(event) => updateField("qbUsername", event.currentTarget.value)}
            />
          </label>

          <label>
            <span>密码</span>
            <input
              type="password"
              name="qbPassword"
              value={settings.qbPassword}
              placeholder="你的 WebUI 密码"
              onChange={(event) => updateField("qbPassword", event.currentTarget.value)}
            />
          </label>

          <div className="settings-grid">
            <label>
              <span>并发数</span>
              <input
                type="number"
                min={1}
                max={3}
                value={settings.concurrency}
                onChange={(event) => updateField("concurrency", Number(event.currentTarget.value))}
              />
            </label>
            <label>
              <span>重试次数</span>
              <input
                type="number"
                min={0}
                max={3}
                value={settings.retryCount}
                onChange={(event) => updateField("retryCount", Number(event.currentTarget.value))}
              />
            </label>
            <label>
              <span>注入超时(ms)</span>
              <input
                type="number"
                min={3000}
                max={60000}
                step={500}
                value={settings.injectTimeoutMs}
                onChange={(event) => updateField("injectTimeoutMs", Number(event.currentTarget.value))}
              />
            </label>
            <label>
              <span>稳定等待(ms)</span>
              <input
                type="number"
                min={200}
                max={10000}
                step={100}
                value={settings.domSettleMs}
                onChange={(event) => updateField("domSettleMs", Number(event.currentTarget.value))}
              />
            </label>
          </div>

          <details className="advanced">
            <summary>高级设置</summary>
            <label>
              <span>第三方脚本地址</span>
              <input
                type="text"
                value={settings.remoteScriptUrl}
                onChange={(event) => updateField("remoteScriptUrl", event.currentTarget.value)}
              />
            </label>
            <label>
              <span>脚本版本号</span>
              <input
                type="text"
                value={settings.remoteScriptRevision}
                onChange={(event) => updateField("remoteScriptRevision", event.currentTarget.value)}
              />
            </label>
          </details>

          <div className="actions">
            <button type="submit" className="primary">
              保存设置
            </button>
            <button type="button" onClick={handleTestConnection} disabled={testing}>
              测试 qB 连接
            </button>
          </div>
        </form>

        <p className="status">{status}</p>
      </section>
    </main>
  )
}
