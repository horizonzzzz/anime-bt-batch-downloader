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
    colorPrimary: "#9f4c1d",
    colorInfo: "#25566a",
    colorSuccess: "#2d6c4f",
    colorWarning: "#b06a1b",
    colorError: "#a33c32",
    borderRadius: 18,
    colorBgBase: "#f4efe7",
    colorTextBase: "#1f2933",
    colorTextSecondary: "#5a6570",
    fontFamily:
      '"Aptos", "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif'
  },
  components: {
    Card: {
      borderRadiusLG: 26
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
