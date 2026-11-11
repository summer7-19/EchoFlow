<script setup lang="ts">
import { computed } from 'vue'
import { Volume2 } from 'lucide-vue-next'
import type { TranscriptPayload } from '../../types/scenes'
import type { TranscribeSegment } from '../../api/transcribe'
import { formatClock } from '../../utils/scenes'

const props = defineProps<{
  payload?: TranscriptPayload | null
  transcript: TranscribeSegment[]
  activeSegment: number
}>()
const emit = defineEmits<{ (event: 'seek', time: number): void }>()

const characterCount = computed(() =>
  props.transcript.reduce((total, line) => total + line.text.replace(/\s/g, '').length, 0),
)
const speakers = computed(() =>
  new Set(props.transcript.map(line => line.speaker).filter(Boolean)).size,
)

function seek(seconds: number) {
  emit('seek', Math.max(0, seconds))
}
</script>
<template>
    <div class="scene-content alternative-scene transcript-scene">
        <div class="scene-title-row">
            <div><span class="tiny-label">VERBATIM TRANSCRIPT</span>
                <h3>{{ payload?.title || '录音原文' }}</h3>
                <p>保留原始表达，仅做语音转写，不做结构化改写</p>
            </div><span class="transcript-tag">{{ transcript.length }} 段</span>
        </div>
        <div class="transcript-summary">
            <span>◉ {{ characterCount }} 字</span>
            <span v-if="payload?.language">{{ payload.language }}</span>
            <span v-if="speakers">{{ speakers }} 位说话人</span>
        </div>
        <div class="transcript-lines">
            <button v-for="(line, index) in transcript" :key="line.id"
                :class="['transcript-line', { active: index === activeSegment }]" @click="seek(line.start)">
                <span class="transcript-time">{{ formatClock(line.start) }}</span>
                <span class="transcript-copy">
                    <small v-if="line.speaker">{{ line.speaker }}</small>
                    <span>{{ line.text }}</span>
                </span>
                <Volume2 :size="14" />
            </button>
            <p v-if="!transcript.length" class="transcript-empty">暂无转写内容，请先运行语音转写或重新解析。</p>
        </div>
    </div>
</template>
<style>
.transcript-tag {
    font-size: 9px;
    color: #6d8f86;
    background: #eff6f4;
    border-radius: 5px;
    padding: 6px 8px;
    white-space: nowrap;
}

.transcript-summary {
    display: flex;
    gap: 17px;
    padding: 15px 0;
    border-bottom: 1px solid #edf0ed;
    color: #859188;
    font-size: 9px;
}

.transcript-lines {
    padding-top: 8px;
}

.transcript-line {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    text-align: left;
    padding: 11px 7px;
    border-bottom: 1px solid #f1f3f1;
    border-radius: 5px;
    transition: background .15s;
}

.transcript-line:hover,
.transcript-line.active {
    background: #f3f9f4;
}

.transcript-time {
    flex: 0 0 42px;
    padding-top: 1px;
    color: #6c9c77;
    font: 9px Manrope, sans-serif;
}

.transcript-copy {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    line-height: 1.8;
    color: #5f6d63;
    overflow-wrap: break-word;
}

.transcript-copy small {
    font-size: 8px;
    color: #8eaaa0;
}

.transcript-line>svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #a0ada5;
}

.transcript-empty {
    padding: 24px 7px;
    color: #9aa49d;
    font-size: 12px;
    text-align: center;
}
</style>
