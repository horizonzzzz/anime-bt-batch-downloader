import type { JSX } from "react"

import { Alert } from "../../../ui"

export function ConnectionHelpAlert(): JSX.Element {
  return (
    <Alert
      tone="info"
      title="qB WebUI 兼容性提示"
      description={
        <div className="grid gap-3">
          <p className="m-0">
            扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:7474</code> 这类本机
            WebUI。若测试连接返回 401，而账号密码确认无误，请先在 qBittorrent 的{" "}
            <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
            <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
          </p>
          <p className="m-0">
            如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在
            WebUI 只供本机使用时这样配置，不建议暴露到局域网或公网。
          </p>
        </div>
      }
    />
  )
}
