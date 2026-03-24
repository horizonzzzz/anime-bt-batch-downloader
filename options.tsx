import "antd/dist/reset.css"
import "./styles/options.css"

import { App as AntApp, ConfigProvider } from "antd"

import { OptionsPage, type OptionsApi } from "./components/options-page"
import { DEFAULT_SETTINGS } from "./lib/settings"
import type { Settings } from "./lib/types"

const api: OptionsApi = {
  async loadSettings() {
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" })
    if (!response?.ok) {
      throw new Error(response?.error ?? "无法读取设置。")
    }

    return response.settings as Settings
  },
  async saveSettings(settings) {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings
    })

    if (!response?.ok) {
      throw new Error(response?.error ?? "保存失败。")
    }

    return (response.settings as Settings) ?? DEFAULT_SETTINGS
  },
  async testConnection(settings) {
    const response = await chrome.runtime.sendMessage({
      type: "TEST_QB_CONNECTION",
      settings
    })

    if (!response?.ok) {
      throw new Error(response?.error ?? "连接测试失败。")
    }

    return response.result
  }
}

const theme = {
  token: {
    colorPrimary: "#2563eb",
    colorInfo: "#2563eb",
    colorSuccess: "#15803d",
    colorWarning: "#b45309",
    colorError: "#b91c1c",
    borderRadius: 20,
    colorBgBase: "#f5f7fb",
    colorTextBase: "#0f172a",
    colorTextSecondary: "#526075",
    fontFamily:
      '"Aptos", "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif'
  },
  components: {
    Card: {
      borderRadiusLG: 24
    },
    Button: {
      controlHeight: 46,
      fontWeight: 600
    },
    Input: {
      controlHeight: 46
    },
    InputNumber: {
      controlHeight: 46
    }
  }
}

function Options() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp>
        <OptionsPage api={api} />
      </AntApp>
    </ConfigProvider>
  )
}

export default Options
