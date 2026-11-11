<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ClipboardCopy, FileText } from 'lucide-vue-next'
import type { TranscriptPayload } from '../../../types/scenes'
import type { TranscribeSegment } from '../../../api/transcribe'

const props = defineProps<{
  payload?: TranscriptPayload | null
  lines: TranscribeSegment[]
}>()

const copied = ref(false)
const characterCount = computed(() =>
  props.lines.reduce((total, line) => total + line.text.replace(/\s/g, '').length, 0),
)
const speakerCount = computed(() =>
  new Set(props.lines.map(line => line.speaker).filter(Boolean)).size,
)
const duration = computed(() => props.lines[props.lines.length - 1]?.end ?? 0)

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

async function copyTranscript() {
  if (!props.lines.length) return
  const text = props.lines.map(line => line.text).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1600)
  } catch {
    copied.value = false
  }
}
</script>
<template>
  <div class="transcript-context">
    <div class="transcript-stat"><span>转写段落</span><b>{{ lines.length }} <small>段</small></b>
      <div class="transcript-stat-row"><span>{{ characterCount }} 字</span><span>{{ formatDuration(duration) }}</span><span
          v-if="speakerCount">{{ speakerCount }} 位说话人</span></div>
    </div>
    <div class="transcript-note"><span class="tiny-label">TRANSCRIPT MODE</span>
      <p>普通录音仅做语音转写，保留原始表达与时间戳，不生成结构化分析。</p>
    </div>
    <div class="transcript-meta"><span class="tiny-label">SOURCE</span>
      <div class="meta-row"><FileText :size="13" /><span>{{ payload?.title || '录音原文' }}</span></div>
      <div v-if="payload?.language" class="meta-row"><span class="meta-key">语言</span><span>{{ payload.language }}</span></div>
    </div>
    <button class="copy-btn" :disabled="!lines.length" @click="copyTranscript">
      <Check v-if="copied" :size="14" />
      <ClipboardCopy v-else :size="14" />
      {{ copied ? '已复制全文' : '复制转写全文' }}
    </button>
  </div>
</template>
<style>
.transcript-stat {
    margin: 17px 0;
    padding: 12px;
    border: 1px solid #edf0ed;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
}

.transcript-stat>span {
    font-size: 13px;
    color: #929d95;
}

.transcript-stat>b {
    font: 700 19px Manrope, sans-serif;
    color: #57836f;
}

.transcript-stat>b small {
    font-size: 11px;
    color: #9da7a0;
}

.transcript-stat-row {
    grid-column: span 2;
    display: flex;
    gap: 12px;
    margin-top: 7px;
    font-size: 10px;
    color: #9ba59e;
}

.transcript-note {
    padding: 12px;
    background: #f7faf7;
    border-radius: 7px;
}

.transcript-note .tiny-label {
    font-size: 12px;
}

.transcript-note p {
    margin: 7px 0 0;
    font-size: 11px;
    line-height: 1.7;
    color: #8a968d;
}

.transcript-meta {
    margin-top: 18px;
}

.transcript-meta .tiny-label {
    font-size: 12px;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    padding: 8px 9px;
    border: 1px solid #edf1ed;
    border-radius: 6px;
    color: #718078;
    font-size: 11px;
    overflow: hidden;
}

.meta-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.meta-key {
    color: #9aa59d;
}

.copy-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    margin-top: 16px;
    border: 1px solid #dfe9e1;
    border-radius: 7px;
    background: #f3f9f4;
    color: #518a61;
    font-size: 11px;
}

.copy-btn:disabled {
    opacity: .45;
    cursor: not-allowed;
}
</style>
