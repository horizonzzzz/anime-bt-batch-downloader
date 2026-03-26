import { useEffect, useMemo, useState } from "react"

import { Alert, Button, Card, Form, Input, InputNumber, Tag, Typography } from "antd"
import type { AlertProps } from "antd"
import { FaGithub } from "react-icons/fa"
import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import { SOURCE_IDS, SITE_CONFIG_META } from "../lib/source-config"
import { DEFAULT_SETTINGS } from "../lib/settings"
import type { Settings, TestQbConnectionResult } from "../lib/types"
import { SiteManagementView } from "./site-management-view"
import styles from "./options-page.module.scss"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

type StatusTone = "info" | "success" | "error"
type OptionsViewId = "general" | "sites" | "overview"
type ConnectionState = "idle" | "success" | "error"

const statusTypeMap: Record<StatusTone, AlertProps["type"]> = {
  info: "info",
  success: "success",
  error: "error"
}

const BRAND_NAME = "Anime BT Batch"
const REPO_URL = "https://github.com/horizonzzzz/anime-bt-batch-downloader"

const viewMeta: Record<
  OptionsViewId,
  {
    title: string
    description: string
    footerLabel: string
  }
> = {
  general: {
    title: "连接与基础设置",
    description: "配置 qBittorrent WebUI 的连接信息，以及全局批量提取节奏。",
    footerLabel: "正在编辑全局配置"
  },
  sites: {
    title: "站点配置",
    description: "统一管理 4 个站点的启用状态和专属配置。",
    footerLabel: "正在编辑站点配置"
  },
  overview: {
    title: "源站概览",
    description: "查看当前支持站点的简介与访问入口。",
    footerLabel: "正在查看支持源站概览"
  }
}

const navItems: Array<{ key: OptionsViewId; label: string }> = [
  { key: "general", label: "连接与基础设置" },
  { key: "sites", label: "站点配置" },
  { key: "overview", label: "源站概览" }
]

const siteCardAccentClassNames: Record<"default" | "emerald" | "cyan", string | undefined> = {
  default: undefined,
  emerald: styles.siteCardDongmanhuayuan,
  cyan: styles.siteCardAcgrip
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ")
}

function normalizeSettings(values: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...values,
    concurrency: Number(values.concurrency ?? DEFAULT_SETTINGS.concurrency),
    retryCount: Number(values.retryCount ?? DEFAULT_SETTINGS.retryCount),
    injectTimeoutMs: Number(values.injectTimeoutMs ?? DEFAULT_SETTINGS.injectTimeoutMs),
    domSettleMs: Number(values.domSettleMs ?? DEFAULT_SETTINGS.domSettleMs),
    sourceDeliveryModes: {
      ...DEFAULT_SETTINGS.sourceDeliveryModes,
      ...(values.sourceDeliveryModes ?? {})
    },
    enabledSources: {
      ...DEFAULT_SETTINGS.enabledSources,
      ...(values.enabledSources ?? {})
    }
  }
}

function SidebarButton({
  active,
  label,
  onClick
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={joinClassNames(styles.sidebarButton, active && styles.isActive)}
      onClick={onClick}>
      <span className={styles.sidebarButtonDot} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

export function OptionsPage({ api }: OptionsPageProps) {
  const [form] = Form.useForm<Settings>()
  const [activeView, setActiveView] = useState<OptionsViewId>("general")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [status, setStatus] = useState<{ tone: StatusTone; message: string }>({
    tone: "info",
    message: "正在读取已保存设置。"
  })
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [connectionMessage, setConnectionMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let active = true

    void api
      .loadSettings()
      .then((loaded) => {
        if (!active) {
          return
        }

        form.setFieldsValue(normalizeSettings(loaded))
        setStatus({
          tone: "success",
          message: "设置已加载。"
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : "无法读取设置。"
        })
      })

    return () => {
      active = false
    }
  }, [api, form])

  const activeMeta = useMemo(() => viewMeta[activeView], [activeView])

  const handleSave = async () => {
    setSaving(true)
    setStatus({
      tone: "info",
      message: "正在保存设置。"
    })

    try {
      const nextSettings = normalizeSettings(form.getFieldsValue(true))
      const saved = normalizeSettings(await api.saveSettings(nextSettings))
      form.setFieldsValue(saved)
      setStatus({
        tone: "success",
        message: "设置已保存。"
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "保存失败。"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    const currentSettings = normalizeSettings(form.getFieldsValue(true))

    setTesting(true)
    setConnectionState("idle")
    setConnectionMessage("")
    setStatus({
      tone: "info",
      message: "正在测试连接。"
    })

    try {
      const result = await api.testConnection(currentSettings)
      setConnectionState("success")
      setConnectionMessage(`已连接到 ${result.baseUrl || "qBittorrent WebUI"}。`)
      setStatus({
        tone: "success",
        message: `连接成功。 ${result.baseUrl || ""} 版本 ${result.version || "unknown"}`
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "连接测试失败。"
      setConnectionState("error")
      setConnectionMessage(message)
      setStatus({
        tone: "error",
        message
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <main className={styles.shell}>
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_SETTINGS}
        onFinish={() => void handleSave()}
        className={styles.workbench}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <div className={styles.sidebarBrandMark}>
              <img
                src={speedlineBrandIcon}
                alt=""
                loading="eager"
                decoding="async"
                data-testid="options-brand-icon"
                className={styles.sidebarBrandIcon}
                aria-hidden="true"
              />
            </div>
            <div>
              <div className={styles.sidebarBrandName}>{BRAND_NAME}</div>
              <div className={styles.sidebarBrandSubtitle}>Extension Settings</div>
            </div>
          </div>

          <div className={styles.sidebarGroups} data-testid="options-sidebar-groups">
            {navItems.map((item) => (
              <SidebarButton
                key={item.key}
                active={activeView === item.key}
                label={item.label}
                onClick={() => setActiveView(item.key)}
              />
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarFooterMeta}>
              <span>{SOURCE_IDS.length} 个支持源站</span>
              <strong>qBittorrent WebUI</strong>
            </div>
            <a
              className={styles.githubLink}
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="查看 GitHub 仓库">
              <FaGithub aria-hidden="true" focusable="false" />
              <span>查看 GitHub 仓库</span>
            </a>
          </div>
        </aside>

        <section className={styles.main}>
          <div className={styles.mainScroll}>
            <div className={styles.mainInner}>
              <header className={styles.pageHeader}>
                <Tag variant="filled" className={styles.pageHeaderTag}>
                  {BRAND_NAME}
                </Tag>
                <Typography.Title level={1}>{activeMeta.title}</Typography.Title>
                {activeMeta.description ? (
                  <Typography.Paragraph>{activeMeta.description}</Typography.Paragraph>
                ) : null}
              </header>

              <div role="status" aria-live="polite" className={styles.status}>
                <Alert showIcon type={statusTypeMap[status.tone]} title={status.message} />
              </div>

              {activeView === "general" && (
                <div className={styles.view}>
                  <Alert
                    showIcon
                    type="info"
                    className={styles.note}
                    title="qB WebUI 兼容性提示"
                    description={
                      <div className={styles.noteBody}>
                        <p>
                          扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:7474</code> 这类本机
                          WebUI。若测试连接返回 401，而账号密码确认无误，请先在 qBittorrent 的{" "}
                          <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
                          <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
                        </p>
                        <p>
                          如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在
                          WebUI 只供本机使用时这样配置，不建议暴露到局域网或公网。
                        </p>
                      </div>
                    }
                  />

                  <Card variant="borderless" className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <Typography.Title level={3}>qBittorrent 认证</Typography.Title>
                        <Typography.Paragraph>
                          配置扩展用于测试连接和提交任务的 WebUI 地址与账号信息。
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className={styles.fieldGrid}>
                      <Form.Item
                        label="qBittorrent WebUI 地址"
                        name="qbBaseUrl"
                        rules={[{ required: true, message: "请输入 qBittorrent WebUI 地址" }]}>
                        <Input placeholder="http://127.0.0.1:7474" autoComplete="url" />
                      </Form.Item>
                      <Form.Item label="用户名" name="qbUsername">
                        <Input placeholder="admin" autoComplete="username" />
                      </Form.Item>
                      <Form.Item label="密码" name="qbPassword">
                        <Input.Password
                          placeholder="你的 WebUI 密码"
                          autoComplete="current-password"
                        />
                      </Form.Item>
                    </div>

                    <div className={styles.inlineActions}>
                      <Button
                        type="default"
                        aria-label="测试 qB 连接"
                        onClick={() => void handleTestConnection()}
                        loading={testing}
                        disabled={testing}>
                        测试 qB 连接
                      </Button>

                      {connectionState !== "idle" ? (
                        <span
                          className={joinClassNames(
                            styles.inlineFeedback,
                            connectionState === "success"
                              ? styles.isSuccess
                              : styles.isError
                          )}>
                          {connectionState === "success" ? "连接成功" : "连接失败"}
                          {connectionMessage ? ` · ${connectionMessage}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </Card>

                  <Card
                    variant="borderless"
                    className={joinClassNames(
                      styles.panel,
                      styles.advancedPanel,
                      advancedOpen && styles.isOpen
                    )}>
                    <button
                      type="button"
                      className={styles.advancedToggle}
                      aria-expanded={advancedOpen}
                      onClick={() => setAdvancedOpen((current) => !current)}>
                      <div>
                        <Typography.Title level={3}>批量提取节奏</Typography.Title>
                        <Typography.Paragraph>
                          配置并发数、重试次数以及注入和稳定等待时间。
                        </Typography.Paragraph>
                      </div>
                      {advancedOpen ? (
                        <HiChevronUp
                          className={styles.advancedToggleIcon}
                          aria-hidden="true"
                          focusable="false"
                        />
                      ) : (
                        <HiChevronDown
                          className={styles.advancedToggleIcon}
                          aria-hidden="true"
                          focusable="false"
                        />
                      )}
                    </button>

                    {advancedOpen ? (
                      <div className={joinClassNames(styles.fieldGrid, styles.advancedFieldGrid)}>
                        <Form.Item label="并发数" name="concurrency">
                          <InputNumber min={1} max={3} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="重试次数" name="retryCount">
                          <InputNumber min={0} max={3} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="注入超时(ms)" name="injectTimeoutMs">
                          <InputNumber min={3000} max={60000} step={500} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="稳定等待(ms)" name="domSettleMs">
                          <InputNumber min={200} max={10000} step={100} style={{ width: "100%" }} />
                        </Form.Item>
                      </div>
                    ) : null}
                  </Card>
                </div>
              )}

              {activeView === "sites" ? (
                <Form.Item noStyle shouldUpdate>
                  {() => <SiteManagementView form={form} />}
                </Form.Item>
              ) : null}

              {activeView === "overview" && (
                <div className={styles.view}>
                  <div className={styles.overviewGrid}>
                    {SOURCE_IDS.map((sourceId) => {
                      const site = SITE_CONFIG_META[sourceId]

                      return (
                        <Card
                          key={site.id}
                          variant="borderless"
                          className={joinClassNames(
                            styles.siteCard,
                            siteCardAccentClassNames[site.overviewAccent]
                          )}>
                          <div className={styles.siteCardStatus}>
                            <span className={styles.siteCardDot} aria-hidden="true" />
                            <span>支持良好</span>
                          </div>
                          <Typography.Title level={3}>{site.displayName}</Typography.Title>
                          <Typography.Paragraph>{site.summary}</Typography.Paragraph>
                          <Button
                            type="default"
                            onClick={() => window.open(`https://${site.url}`, "_blank")}>
                            访问站点
                          </Button>
                        </Card>
                      )
                    })}
                  </div>

                  <Card
                    variant="borderless"
                    className={joinClassNames(styles.panel, styles.darkPanel)}>
                    <Typography.Title level={3}>当前能力</Typography.Title>
                    <ul className={styles.bullets}>
                      <li>统一的站点配置页集中管理 4 个受支持站点的启用状态和专属参数。</li>
                      <li>禁用站点后不会注入批量下载 UI，后台批处理也会同步拒绝该站点请求。</li>
                      <li>源站概览保留为独立页面，方便查看站点简介与快速访问。</li>
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerContext}>
              <span className={styles.footerEyebrow}>当前视图</span>
              <strong>{activeMeta.footerLabel}</strong>
            </div>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存所有设置
            </Button>
          </footer>
        </section>
      </Form>
    </main>
  )
}
