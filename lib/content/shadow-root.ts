type ShadowMountHostOptions<TagName extends keyof HTMLElementTagNameMap> = {
  hostTagName: TagName
  containerTagName?: keyof HTMLElementTagNameMap
  dataset?: Record<string, string>
  parent: Node
  before?: ChildNode | null
}

type ShadowMountHost<TagName extends keyof HTMLElementTagNameMap> = {
  host: HTMLElementTagNameMap[TagName]
  shadowRoot: ShadowRoot
  container: HTMLElement
}

export function createShadowMountHost<TagName extends keyof HTMLElementTagNameMap>({
  hostTagName,
  containerTagName = "div",
  dataset,
  parent,
  before = null
}: ShadowMountHostOptions<TagName>): ShadowMountHost<TagName> {
  const host = document.createElement(hostTagName)

  for (const [key, value] of Object.entries(dataset ?? {})) {
    host.dataset[key] = value
  }

  parent.insertBefore(host, before)

  const shadowRoot = host.attachShadow({
    mode: "open"
  })
  const container = document.createElement(containerTagName)
  shadowRoot.appendChild(container)

  return {
    host,
    shadowRoot,
    container
  }
}

export function ensureShadowStyle(
  shadowRoot: ShadowRoot,
  styleId: string,
  styleText: string
) {
  if (!styleText) {
    return null
  }

  const selector = `style[data-anime-bt-batch-shadow-style="${styleId}"]`
  const existing = shadowRoot.querySelector<HTMLStyleElement>(selector)
  if (existing) {
    return existing
  }

  const style = document.createElement("style")
  style.dataset.animeBtBatchShadowStyle = styleId
  style.textContent = styleText
  shadowRoot.prepend(style)
  return style
}
