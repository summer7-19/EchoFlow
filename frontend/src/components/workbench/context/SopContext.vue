<script setup lang="ts">
import { computed } from 'vue'
import type { SopPayload } from '../../../types/scenes'

const props = defineProps<{
  payload: SopPayload
  checked: boolean[]
}>()
const emit = defineEmits<{ (event: 'tick'): void }>()

const steps = computed(() =>
  [...props.payload.steps].sort((left, right) => left.order - right.order),
)
const total = computed(() => steps.value.length)
const completed = computed(() => steps.value.filter((_, index) => props.checked[index]).length)
const percent = computed(() => (total.value ? Math.round((completed.value / total.value) * 100) : 0))
const warnings = computed(() => steps.value.flatMap(step => step.warnings ?? []))

const chain = computed(() => {
  if (!steps.value.length) return []
  const currentIndex = Math.min(completed.value, steps.value.length - 1)
  return [
    { title: steps.value[0].title, state: completed.value > 0 ? 'dep-done' : 'dep-current' },
    { title: steps.value[currentIndex].title, state: completed.value > 0 && completed.value < total.value ? 'dep-current' : '' },
    { title: '完成', state: completed.value >= total.value && total.value > 0 ? 'dep-done' : '' },
  ]
})
</script>
<template>
  <div class="sop-context">
    <div class="side-meter"><span>完成进度</span><b>{{ completed }} <small>/ {{ total }}</small></b>
      <div><i :style="{ width: `${percent}%` }"></i></div>
    </div>
    <div class="dependency"><span class="tiny-label">DEPENDENCIES</span>
      <div class="dep-chain"><template v-for="(node, index) in chain" :key="`${node.title}-${index}`"><i
            v-if="index"></i><span :class="node.state">{{ node.title }}</span></template></div>
    </div>
    <div class="warning-panel"><span class="alert-symbol">!</span>
      <div><b>关键提醒</b>
        <p>{{ warnings[0] || (total ? '该流程未标注额外注意事项。' : '暂无流程数据。') }}</p>
      </div>
    </div>
    <div class="side-note"><span class="tiny-label">STEP SUMMARY</span>
      <p>共 <b>{{ total }} 个步骤</b>，已完成 {{ completed }} 个</p><button @click="emit('tick')">启动计时
        <span>+1s</span>
      </button>
    </div>
  </div>
</template>
<style>
.side-meter {
    margin: 17px 0;
    padding: 12px;
    border: 1px solid #edf0ed;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
}

.side-meter>span {
    font-size: 15px;
    color: #929d95;
}

.side-meter>b {
    font: 700 19px Manrope, sans-serif;
    color: #588c65;
}

.side-meter>b small {
    font-size: 11px;
    color: #9da7a0;
}

.side-meter>div {
    grid-column: span 2;
    height: 4px;
    background: #edf1ed;
    border-radius: 4px;
    margin-top: 9px;
}

.side-meter>div i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: #7db88b;
    transition: width .2s ease;
}

.dependency {
    margin-top: 8px;
}

.dependency .tiny-label {
    font-size: 13px;
}

.dep-chain {
    display: flex;
    align-items: center;
    margin-top: 12px;
}

.dep-chain span {
    font-size: 11px;
    padding: 6px;
    border-radius: 5px;
    background: #f4f6f4;
    color: #8a958d;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dep-chain span.dep-done {
    background: #edf6ee;
    color: #649273;
}

.dep-chain span.dep-current {
    background: #e6f2e8;
    color: #4c885e;
}

.dep-chain i {
    width: 15px;
    flex: 0 0 15px;
    border-top: 1px solid #dfe6df;
}

.warning-panel {
    display: flex;
    gap: 8px;
    background: #fff9f5;
    border: 1px solid #f5eae2;
    border-radius: 7px;
    padding: 10px;
    margin-top: 20px;
}

.warning-panel>div b {
    font-size: 13px;
    color: #8d6f60;
}

.warning-panel p {
    font-size: 12px;
    color: #988278;
    line-height: 1.6;
    margin: 5px 0 0;
}

.side-note {
    margin-top: 20px;
    padding: 12px;
    background: #f7faf7;
    border-radius: 7px;
}

.side-note p {
    font-size: 13px;
    color: #8a968d;
    margin: 8px 0;
}

.side-note p b {
    color: #4f7658;
}

.side-note button {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #5e936b;
    font-size: 11px;
}
</style>
