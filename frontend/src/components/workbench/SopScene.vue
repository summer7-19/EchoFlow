<script setup lang="ts">
import { computed } from 'vue'
import { Volume2 } from 'lucide-vue-next'
import type { SopPayload } from '../../types/scenes'
import type { TranscribeSegment } from '../../api/transcribe'
import { formatClock, segmentStart } from '../../utils/scenes'

const props = defineProps<{
  payload: SopPayload
  transcript: TranscribeSegment[]
  checked: boolean[]
}>()
const emit = defineEmits<{
  (event: 'toggle', index: number): void
  (event: 'seek', time: number): void
}>()

const steps = computed(() =>
  [...props.payload.steps].sort((left, right) => left.order - right.order),
)
const warningCount = computed(
  () => steps.value.reduce((total, step) => total + (step.warnings?.length ?? 0), 0),
)
const totalMinutes = computed(() =>
  Math.round(steps.value.reduce((total, step) => total + (step.duration ?? 0), 0) / 60),
)

function stepTime(index: number) {
  const time = segmentStart(props.transcript, steps.value[index]?.segmentId)
  return time === undefined ? undefined : formatClock(time)
}

function seekStep(index: number) {
  const time = segmentStart(props.transcript, steps.value[index]?.segmentId)
  if (time !== undefined) emit('seek', time)
}
</script>
<template>
    <div class="scene-content alternative-scene">
        <div class="scene-title-row">
            <div><span class="tiny-label">STANDARD OPERATING PROCEDURE</span>
                <h3>{{ payload.title }}</h3>
                <p>根据录音整理的操作步骤与关键参数</p>
            </div><span class="safety-tag">{{ warningCount ? `${warningCount} 项提醒` : '无特别提醒' }}</span>
        </div>
        <div class="sop-summary">
            <span>◉ {{ steps.length }} 个步骤</span>
            <span v-if="totalMinutes">⏱ 预计 {{ totalMinutes }} 分钟</span>
            <span v-if="warningCount">♧ {{ warningCount }} 项关键提醒</span>
        </div>
        <div class="step-list"><button v-for="(step, i) in steps" :key="`${step.order}-${i}`" class="step-item"
                @click="emit('toggle', i)"><span :class="['step-number', { done: checked[i] }]">{{ checked[i] ? '✓' : String(step.order).padStart(2, '0') }}</span><span class="step-copy"><b>{{ step.title }}</b><small>{{ stepTime(i) || '--:--' }} <span>· 原声定位</span></small></span>
                <Volume2 :size="15" @click.stop="seekStep(i)" />
            </button>
            <p v-if="!steps.length" class="step-empty">LLM 未提取到可执行步骤。</p>
        </div>
    </div>
</template>
<style>
.safety-tag {
    font-size: 9px;
    color: #6d9a75;
    background: #eff7ef;
    border-radius: 5px;
    padding: 6px 8px;
}

.sop-summary {
    display: flex;
    gap: 17px;
    padding: 15px 0;
    border-bottom: 1px solid #edf0ed;
    color: #859188;
    font-size: 9px;
}

.step-list {
    padding-top: 8px;
}

.step-empty {
    padding: 20px 7px;
    color: #9aa49d;
    font-size: 12px;
}

.step-item {
    width: 100%;
    display: flex;
    text-align: left;
    align-items: center;
    gap: 12px;
    padding: 13px 7px;
    border-bottom: 1px solid #f1f3f1;
}

.step-number {
    width: 27px;
    height: 27px;
    flex: 0 0 27px;
    border-radius: 50%;
    border: 1px solid #e2e8e2;
    color: #89978b;
    display: grid;
    place-items: center;
    font: 9px Manrope, sans-serif;
}

.step-number.done {
    background: #e9f5eb;
    color: #61a475;
    border-color: #d8ebdc;
}

.step-copy {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.step-copy b {
    font-size: 10px;
    font-weight: 500;
}

.step-copy small {
    font: 8px Manrope, sans-serif;
    color: #a3aca5;
}

.step-copy small span {
    font: 8px 'Noto Sans SC', sans-serif;
    color: #79a284;
}

.step-item>svg {
    color: #94a399;
    flex: 0 0 auto;
}
</style>
