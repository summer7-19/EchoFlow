<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { TranscribeSegment } from '../../../api/transcribe'

defineProps<{
  open: boolean
  lines: TranscribeSegment[]
  transcribing?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'seek', time: number): void
}>()

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
</script>
<template>
  <div v-if="open" class="side-transcript">
    <div><b>听力原文</b><button aria-label="关闭听力原文" @click="emit('close')">
        <X :size="14" />
      </button></div>
    <p v-if="transcribing" class="transcript-status">正在调用 FunASR 转写，请稍候…</p>
    <p v-else-if="error" class="transcript-status error">{{ error }}</p>
    <p v-else-if="!lines.length" class="transcript-status">暂无转写结果</p>
    <template v-else>
      <p v-for="line in lines" :key="line.id" class="transcript-line-item" @click="emit('seek', line.start)">
        <span class="transcript-time">{{ formatTime(line.start) }}</span>
        <span class="transcript-text">{{ line.text }}</span>
      </p>
    </template>
  </div>
</template>
<style>
.side-transcript {
    margin-top: 14px;
    padding: 13px;
    border: 1px solid #e9eee9;
    border-radius: 8px;
    background: #fafcfa;
}

.side-transcript>div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}

.side-transcript>div button {
    display: grid;
    place-items: center;
    color: #87938a;
}

.side-transcript p {
    font-size: 12px;
    line-height: 1.7;
    color: #68766c;
    margin: 12px 0 0;
}

.transcript-time {
    color: #6c9c77;
    font: 10px Manrope, sans-serif;
    margin-right: 6px;
}

.transcript-text {
    overflow-wrap: break-word;
}

.side-transcript .transcript-line-item {
    cursor: pointer;
    border-radius: 5px;
    padding: 3px 4px;
    margin: 9px -4px 0;
    transition: background .15s;
}

.side-transcript .transcript-line-item:hover {
    background: #eef5ef;
}

.side-transcript .transcript-status {
    color: #929d95;
}

.side-transcript .transcript-status.error {
    color: #b85d4e;
}
</style>
