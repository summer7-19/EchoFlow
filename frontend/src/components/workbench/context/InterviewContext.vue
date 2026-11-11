<script setup lang="ts">
import { computed } from 'vue'
import { MessagesSquare, Volume2 } from 'lucide-vue-next'
import type { InterviewPayload } from '../../../types/scenes'
import type { TranscribeSegment } from '../../../api/transcribe'
import { formatClock, segmentStart } from '../../../utils/scenes'

const props = defineProps<{
  payload: InterviewPayload
  transcript: TranscribeSegment[]
}>()
const emit = defineEmits<{ (event: 'seek', time: number): void }>()

const highlights = computed(() => props.payload.highlights ?? [])
const evaluations = computed(() => props.payload.rounds.filter(round => round.evaluation))
const firstClue = computed(() => props.payload.rounds.find(round => round.segmentId)?.segmentId)
const firstClueTime = computed(() => {
  const time = segmentStart(props.transcript, firstClue.value)
  return time === undefined ? undefined : formatClock(time)
})
</script>
<template>
  <div class="interview-context">
    <div class="interview-meter"><span>问答轮次</span><b>{{ payload.rounds.length }} <small>轮</small></b>
      <div class="interview-meter-sub">{{ highlights.length }} 条重点 · {{ evaluations.length }} 条评价</div>
    </div>
    <div class="round-section"><span class="tiny-label">QUESTION FLOW</span>
      <div class="round-cloud"><span v-for="(round, index) in payload.rounds" :key="`${index}-${round.question}`">
          {{ index + 1 }}. {{ round.question }}</span></div>
      <p v-if="!payload.rounds.length" class="interview-context-empty">未提取到问答内容。</p>
    </div>
    <div class="highlight-section"><span class="tiny-label">KEY HIGHLIGHTS</span>
      <ul v-if="highlights.length"><li v-for="(item, index) in highlights" :key="`${index}-${item}`">{{ item }}</li></ul>
      <p v-else class="interview-context-empty">未提取到复盘要点。</p>
    </div>
    <button v-if="firstClue" class="listen-card" @click="emit('seek', segmentStart(transcript, firstClue) ?? 0)">
      <MessagesSquare :size="15" />
      <span><b>回听第一轮问答</b><small>{{ firstClueTime }} · 原声定位</small></span>
      <Volume2 :size="14" />
    </button>
  </div>
</template>
<style>
.interview-meter {
    margin: 17px 0;
    padding: 12px;
    border: 1px solid #edf0ed;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
}

.interview-meter>span {
    font-size: 13px;
    color: #929d95;
}

.interview-meter>b {
    font: 700 19px Manrope, sans-serif;
    color: #6a7793;
}

.interview-meter>b small {
    font-size: 11px;
    color: #9da7a0;
}

.interview-meter-sub {
    grid-column: span 2;
    margin-top: 7px;
    font-size: 10px;
    color: #9ba59e;
}

.round-section,
.highlight-section {
    margin-top: 18px;
}

.round-section .tiny-label,
.highlight-section .tiny-label {
    font-size: 12px;
}

.round-cloud {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 8px;
}

.round-cloud span {
    font-size: 10px;
    color: #7a8c7d;
    background: #f4f6f4;
    border-radius: 4px;
    padding: 6px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.highlight-section ul {
    margin: 8px 0 0;
    padding-left: 16px;
    color: #77847a;
    font-size: 11px;
    line-height: 1.8;
}

.highlight-section li::marker {
    color: #8b93b0;
}

.interview-context-empty {
    margin: 9px 0 0;
    font-size: 11px;
    color: #9aa59d;
}

.listen-card {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    text-align: left;
    margin-top: 18px;
    padding: 11px;
    border-radius: 7px;
    border: 1px solid #edf0ed;
    background: #f8faf8;
    color: #7e8ca4;
}

.listen-card span {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.listen-card b {
    font-size: 11px;
    color: #5f6f88;
}

.listen-card small {
    font-size: 9px;
    color: #9ca59e;
}
</style>
