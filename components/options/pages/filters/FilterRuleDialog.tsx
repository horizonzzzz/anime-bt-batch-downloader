import { useEffect, useState } from "react"

import type { FilterRule, SourceId } from "../../../../lib/shared/types"
import { Button, Input, Label, RadioGroup, RadioGroupItem, Switch } from "../../../ui"
import {
  createEmptyFilterRuleDraft,
  createFilterRuleDraft,
  hasFilterRuleConditions,
  toFilterRule,
  type FilterRuleDraft
} from "./filter-rule-form"

const SOURCE_OPTIONS: Array<{ id: SourceId; label: string }> = [
  { id: "kisssub", label: "Kisssub" },
  { id: "dongmanhuayuan", label: "Dongmanhuayuan" },
  { id: "acgrip", label: "ACG.RIP" },
  { id: "bangumimoe", label: "Bangumi.moe" }
]

type FilterRuleDialogProps = {
  open: boolean
  initialRule?: FilterRule
  order: number
  onClose: () => void
  onSave: (rule: FilterRule) => void
}

export function FilterRuleDialog({
  open,
  initialRule,
  order,
  onClose,
  onSave
}: FilterRuleDialogProps) {
  const [draft, setDraft] = useState<FilterRuleDraft>(createEmptyFilterRuleDraft())
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }

    setDraft(initialRule ? createFilterRuleDraft(initialRule) : createEmptyFilterRuleDraft())
    setError("")
  }, [initialRule, open])

  if (!open) {
    return null
  }

  const toggleSource = (sourceId: SourceId) => {
    setDraft((current) => {
      const exists = current.sourceIds.includes(sourceId)
      const sourceIds = exists
        ? current.sourceIds.filter((entry) => entry !== sourceId)
        : [...current.sourceIds, sourceId]

      return {
        ...current,
        sourceIds
      }
    })
  }

  const handleSave = () => {
    if (!draft.name.trim()) {
      setError("请输入规则名称")
      return
    }

    if (!draft.sourceIds.length) {
      setError("至少选择一个站点")
      return
    }

    if (!hasFilterRuleConditions(draft)) {
      setError("至少填写一个过滤条件")
      return
    }

    if (draft.action === "include" && draft.titleExcludesText.trim()) {
      setError("保留规则暂不支持使用标题排除条件")
      return
    }

    onSave(toFilterRule(draft, order))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {initialRule ? "编辑规则" : "新建规则"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">按标题和字幕组条件决定是否保留资源。</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
        </div>

        <div className="grid gap-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="filter-rule-name">规则名称</Label>
            <Input
              id="filter-rule-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：排除 RAW"
            />
          </div>

          <div className="space-y-3">
            <Label>规则动作</Label>
            <RadioGroup
              value={draft.action}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, action: value as FilterRule["action"] }))
              }
              className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3">
                <RadioGroupItem value="include" aria-label="保留" />
                <div>
                  <div className="font-medium text-zinc-900">保留</div>
                  <div className="text-sm text-zinc-500">命中后允许继续提交</div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3">
                <RadioGroupItem value="exclude" aria-label="排除" />
                <div>
                  <div className="font-medium text-zinc-900">排除</div>
                  <div className="text-sm text-zinc-500">命中后不再提交到 qBittorrent</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label>生效站点</Label>
              <span className="text-xs text-zinc-500">可多选，至少选择一项</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((source) => {
                const checked = draft.sourceIds.includes(source.id)

                return (
                  <button
                    key={source.id}
                    type="button"
                    className={checked
                      ? "rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                      : "rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"
                    }
                    onClick={() => toggleSource(source.id)}>
                    {source.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="space-y-2">
              <Label htmlFor="filter-rule-title-includes">标题包含</Label>
              <Input
                id="filter-rule-title-includes"
                value={draft.titleIncludesText}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, titleIncludesText: event.target.value }))
                }
                placeholder="多个关键字用英文逗号分隔"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-rule-title-excludes">标题排除</Label>
              <Input
                id="filter-rule-title-excludes"
                value={draft.titleExcludesText}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, titleExcludesText: event.target.value }))
                }
                placeholder="例如：RAW, 720p"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-rule-subgroup-includes">字幕组</Label>
              <Input
                id="filter-rule-subgroup-includes"
                value={draft.subgroupIncludesText}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, subgroupIncludesText: event.target.value }))
                }
                placeholder="例如：喵萌奶茶屋, LoliHouse"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-zinc-900">启用规则</div>
              <div className="text-xs text-zinc-500">保存后立即参与批量筛选。</div>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, enabled: checked }))}
              aria-label="启用规则"
            />
          </div>

          {error ? <p className="text-sm text-crimson-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleSave}>
            保存规则
          </Button>
        </div>
      </div>
    </div>
  )
}
