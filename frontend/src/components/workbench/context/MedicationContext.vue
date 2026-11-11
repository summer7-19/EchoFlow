<script setup lang="ts">
import { computed } from 'vue'
import { Volume2 } from 'lucide-vue-next'
import type { MedicationPayload } from '../../../types/scenes'
import type { TranscribeSegment } from '../../../api/transcribe'
import { segmentStart } from '../../../utils/scenes'

const props = defineProps<{
  payload: MedicationPayload
  transcript: TranscribeSegment[]
}>()
const emit = defineEmits<{ (event: 'seek', time: number): void }>()

const schedule = computed(() =>
  [...props.payload.schedule].sort((left, right) => left.time.localeCompare(right.time)),
)
const warnings = computed(() => props.payload.warnings ?? [])

function seekSegment(segmentId?: string) {
  const time = segmentStart(props.transcript, segmentId)
  if (time !== undefined) emit('seek', time)
}
</script>
<template>
  <div class="med-context">
    <div class="timeline">
      <div class="timeline-date">服药安排 <span>{{ schedule.length }} 个安排</span></div>
      <div v-for="(dose, index) in schedule" :key="`${dose.time}-${index}`" class="timeline-item future"
        :class="{ last: index === schedule.length - 1 }">
        <span class="timeline-node"></span>
        <div class="timeline-content">
          <div class="timeline-time">{{ dose.time }} <span class="upcoming-tag">计划</span></div>
          <b>{{ dose.title }}</b>
          <p>{{ payload.medication.name }} · {{ payload.medication.dose }}</p>
          <button v-if="dose.segmentId" class="timeline-audio" @click="seekSegment(dose.segmentId)">
            <Volume2 :size="12" /> 听取原声
          </button>
        </div>
      </div>
      <p v-if="!schedule.length" class="timeline-empty">LLM 未提取到服药时间。</p>
    </div>
    <div v-if="warnings.length" class="side-safety"><span class="safety-icon">✳</span>
      <p><b>用药提醒</b><br />{{ warnings[0].text }}</p>
      <button v-if="warnings[0].segmentId" @click="seekSegment(warnings[0].segmentId)">听原声 <span>↗</span></button>
    </div>
  </div>
</template>
<style>
.med-context {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.timeline {
    margin-top: 17px;
    position: relative;
}

.timeline:before {
    content: '';
    position: absolute;
    left: 6px;
    top: 30px;
    bottom: 30px;
    width: 2px;
    border-radius: 2px;
    background: linear-gradient(180deg, #a9d8b7, #dbe9dd 55%, #eef2ee);
}

.timeline-date {
    position: relative;
    font-size: 15px;
    color: #5f6f63;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0 10px 24px;
}

.timeline-date:before {
    content: '';
    position: absolute;
    left: 1px;
    top: 3px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #f3f8f4;
    border: 1px solid #d8e6db;
    box-shadow: 0 0 0 3px #fff;
}

.timeline-date span {
    font-size: 14px;
    color: #8f9c93;
    font-weight: 400;
    background: #f4f7f4;
    border-radius: 20px;
    padding: 2px 8px;
}

.timeline-item {
    position: relative;
    display: flex;
    gap: 12px;
    padding: 0 0 16px;
    border-radius: 10px;
}

.timeline-node {
    position: relative;
    z-index: 1;
    flex: 0 0 13px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 1.5px solid #d5e0d7;
    background: #fff;
    margin-top: 2px;
    box-shadow: 0 0 0 3px #fff;
}

.timeline-content {
    flex: 1;
    min-width: 0;
}

.timeline-time {
    font: 600 15px Manrope, sans-serif;
    color: #536157;
    display: flex;
    align-items: center;
    gap: 7px;
}

.timeline-content>b {
    font-size: 15px;
    font-weight: 600;
    display: block;
    margin-top: 4px;
}

.timeline-content p {
    font-size: 14px;
    color: #9aa39d;
    line-height: 1.6;
    margin: 4px 0 0;
}

.timeline-audio {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 7px;
    color: #70937a;
    background: #f6f9f6;
    border-radius: 4px;
    padding: 5px 6px;
    font-size: 14px;
}

.timeline-empty {
    padding: 10px 0 4px 24px;
    color: #9aa49d;
    font-size: 12px;
}

.upcoming-tag {
    font: 10px 'Noto Sans SC', sans-serif;
    color: #8d9990;
    background: #f3f5f3;
    padding: 2px 5px;
    border-radius: 4px;
}

.timeline-item.last {
    padding-bottom: 7px;
}

.side-safety {
    margin-top: auto;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    background: #f6f9f5;
    border-radius: 7px;
    padding: 9px 8px;
    position: relative;
}

.safety-icon {
    font-size: 14px;
    color: #7ca884;
}

.side-safety p {
    font-size: 12px;
    color: #87938a;
    line-height: 1.65;
    margin: 0;
    padding-bottom: 12px;
}

.side-safety p b {
    font-size: 13px;
    color: #657a69;
}

.side-safety button {
    position: absolute;
    right: 3px;
    bottom: 0px;
    font-size: 9px;
    color: #73b282;
}

.side-safety button span {
    color: #73b282;
}

@media(max-width:720px) {
    .side-safety {
        margin-top: 10px;
    }

    .side-pane .timeline-date,
    .side-pane .timeline-time,
    .side-pane .timeline-content>b {
        font-size: 14px;
    }

    .side-pane .timeline-content p,
    .side-pane .timeline-audio {
        font-size: 13px;
    }
}
</style>
