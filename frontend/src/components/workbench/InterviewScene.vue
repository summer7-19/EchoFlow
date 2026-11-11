<script setup lang="ts">
import { computed } from 'vue'
import { Volume2 } from 'lucide-vue-next'
import type { InterviewPayload } from '../../types/scenes'
import type { TranscribeSegment } from '../../api/transcribe'
import { formatClock, segmentStart } from '../../utils/scenes'

const props = defineProps<{
  payload: InterviewPayload
  transcript: TranscribeSegment[]
}>()
const emit = defineEmits<{ (event: 'seek', time: number): void }>()

const rounds = computed(() => props.payload.rounds)
const highlights = computed(() => props.payload.highlights ?? [])

function roundTime(segmentId?: string) {
  const time = segmentStart(props.transcript, segmentId)
  return time === undefined ? undefined : formatClock(time)
}

function seekRound(segmentId?: string) {
  const time = segmentStart(props.transcript, segmentId)
  if (time !== undefined) emit('seek', time)
}
</script>
<template>
    <div class="scene-content alternative-scene interview-scene">
        <div class="scene-title-row">
            <div><span class="tiny-label">INTERVIEW DEBRIEF</span>
                <h3>{{ payload.title }}</h3>
                <p>{{ payload.role || '面试问答与复盘要点' }}</p>
            </div><span class="interview-tag">{{ rounds.length }} 轮问答</span>
        </div>
        <p class="interview-summary">{{ payload.summary }}</p>
        <div class="interview-rounds">
            <div v-for="(round, index) in rounds" :key="`${index}-${round.question}`" class="interview-round">
                <span class="round-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div class="round-copy">
                    <b>{{ round.question }}</b>
                    <small>{{ round.answer }}</small>
                    <em v-if="round.evaluation">{{ round.evaluation }}</em>
                </div>
                <button v-if="round.segmentId" class="round-seek" aria-label="定位原声" title="定位原声"
                    @click="seekRound(round.segmentId)">
                    <Volume2 :size="15" />
                    <small>{{ roundTime(round.segmentId) }}</small>
                </button>
            </div>
            <p v-if="!rounds.length" class="interview-empty">LLM 未提取到面试问答，请检查录音或重新解析。</p>
        </div>
        <div v-if="highlights.length" class="interview-highlights"><span class="tiny-label">KEY HIGHLIGHTS</span>
            <ul><li v-for="(item, index) in highlights" :key="`${index}-${item}`">{{ item }}</li></ul>
        </div>
    </div>
</template>
<style>
.interview-tag {
    font-size: 9px;
    color: #6d7f9a;
    background: #eff3f8;
    border-radius: 5px;
    padding: 6px 8px;
    white-space: nowrap;
}

.interview-summary {
    font-size: 10px;
    color: #77847a;
    line-height: 1.8;
    margin: 16px 0 0;
    padding-bottom: 14px;
    border-bottom: 1px solid #edf0ed;
}

.interview-rounds {
    padding-top: 6px;
}

.interview-round {
    display: flex;
    gap: 12px;
    padding: 14px 7px;
    border-bottom: 1px solid #f1f3f1;
}

.round-index {
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

.round-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.round-copy b {
    font-size: 10px;
    font-weight: 600;
}

.round-copy small {
    font-size: 10px;
    color: #77847a;
    line-height: 1.7;
    white-space: pre-line;
}

.round-copy em {
    font-style: normal;
    font-size: 9px;
    color: #7f9485;
    background: #f4f8f4;
    border-radius: 4px;
    padding: 5px 7px;
}

.round-seek {
    flex: 0 0 auto;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    color: #94a399;
}

.round-seek small {
    font: 8px Manrope, sans-serif;
    color: #a3aca5;
}

.interview-empty {
    padding: 20px 7px;
    color: #9aa49d;
    font-size: 12px;
}

.interview-highlights {
    margin-top: 16px;
    padding: 13px 14px;
    background: #f8faf8;
    border: 1px solid #edf1ed;
    border-radius: 8px;
}

.interview-highlights .tiny-label {
    font-size: 12px;
}

.interview-highlights ul {
    margin: 8px 0 0;
    padding-left: 16px;
    color: #77847a;
    font-size: 10px;
    line-height: 1.9;
}

.interview-highlights li::marker {
    color: #83b18e;
}
</style>
