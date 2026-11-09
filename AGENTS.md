# AI 开发规范

本文件适用于本仓库内的所有代码修改。修改前先查看现有实现，保留与当前任务无关的工作区改动。

## Select 组件必须复用

- 项目统一使用 `src/renderer/src/components/AppSelect/index.vue`。新增或修改普通下拉选择字段时，必须复用 `AppSelect`。
- 不得新增原生 `<select>`、Element Plus 的 `<el-select>`、Vuetify 的 `<v-select>`，也不得在业务页面自行复制一套下拉选择菜单。
- 如果现有能力不足，先在 `AppSelect` 中补充可复用能力，再接入业务页面；不要另建同用途组件。操作菜单、导航菜单等非选择字段不受本条限制。
- 选项类型从 `@/components/AppSelect/types` 导入。`SelectValue` 为 `string | number`，`SelectOption` 使用 `{ label, value, disabled?, description? }`。保持值的原始类型，不要为了接入组件将数字统一转成字符串；`0` 和空字符串都可以是有效值。
- 使用 `v-model` 或 `:model-value` / `@update:model-value` 控制选中值。事件参数是选项值，不是原生 DOM `Event`。业务状态有更窄的类型时，在处理函数中验证后再赋值。
- 每个选择器必须提供可访问名称：优先通过 `<label for="…">` 与组件 `id` 关联；没有可见标签时传入 `aria-label` 或 `aria-labelledby`。异步选项使用 `loading`，不可操作时使用 `disabled`。
- 外观遵循项目的 `--app-*` 主题变量。尺寸使用组件的 `size`，弹出方向使用 `placement`；业务页面只负责宽度、间距和布局，不要通过 `:deep()` 覆盖组件内部样式或复制其 CSS。
- 维护组件时必须保留键盘选择、禁用项跳过、焦点管理、屏幕边缘定位、浅深主题和弹层清理能力。

示例：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import AppSelect from '@/components/AppSelect/index.vue'
import type { SelectOption, SelectValue } from '@/components/AppSelect/types'

const category = ref<SelectValue>('songs')
const options: SelectOption[] = [
  { label: '单曲', value: 'songs' },
  { label: '专辑', value: 'albums' }
]
</script>

<template>
  <label for="result-category">结果类型</label>
  <AppSelect id="result-category" v-model="category" :options="options" size="small" />
</template>
```

## 协作与验证

- 有可独立推进、能节省时间或提高质量的工作时，使用协作工具委派，并在合并结果后复查。
- 未经用户要求，不自动提交或推送代码。
- 验证优先使用定向格式检查、Lint、构建及实际界面检查。遵守用户对测试范围的要求，不要为普通样式调整添加只复述实现的测试。
