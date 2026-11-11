<script setup lang="ts">
import { computed } from 'vue'
import { Activity, ArrowDownToLine, Check, ChevronDown, Volume2 } from 'lucide-vue-next'
import type { MedicationPayload } from '../../types/scenes'
import type { TranscribeSegment } from '../../api/transcribe'
import { formatClock, segmentStart } from '../../utils/scenes'
import { printTranscriptPdf } from '../../utils/export'
const props = defineProps<{
  payload: MedicationPayload
  transcript: TranscribeSegment[]
  activeSegment: number
  current: number
  checked: boolean
  fileName: string
}>()
const emit = defineEmits<{
  (event: 'seek', time: number): void
  (event: 'toggleDose'): void
}>()

const schedule = computed(() =>
  [...props.payload.schedule].sort((left, right) => left.time.localeCompare(right.time)),
)
const warnings = computed(() => props.payload.warnings ?? [])

function seekSegment(segmentId?: string) {
  const time = segmentStart(props.transcript, segmentId)
  if (time !== undefined) emit('seek', time)
}

function exportTranscript() {
  printTranscriptPdf(props.fileName, props.transcript)
}
</script>
<template>
  <div class="scene-content med-scene">
    <div class="med-overview">
      <div class="med-label">用药方案 <span>·</span> 处方药</div>
      <div class="med-drug">
        <div class="pill-mark">✳</div>
        <div>
          <h3>{{ payload.medication.name }}</h3>
          <p>{{ payload.medication.dose }} · {{ payload.medication.method }}</p>
        </div>
      </div>
      <div class="med-tags">
        <span><b>{{ payload.medication.dose }}</b></span><i></i>
        <span>{{ payload.medication.method }}</span>
        <template v-if="schedule.length"><i></i><span>每日 {{ schedule.length }} 次</span></template>
      </div>
    </div>
    <div class="med-main-grid">
      <div class="cycle-card">
        <div class="mini-heading">
          <div><span class="tiny-label">MEDICATION CYCLE</span>
            <h4>服药时间线</h4>
          </div><span class="date-chip">音频 {{ formatClock(current) }}
            <ChevronDown :size="12" />
          </span>
        </div>
        <div class="cycle-layout">
          <div class="cycle-wrap"><svg class="cycle-svg" viewBox="0 0 220 220">
              <circle class="ring-guide" cx="110" cy="110" r="101" fill="none" stroke="#dfeae1" stroke-width="1"
                stroke-dasharray="2 7" stroke-linecap="round" />
              <circle class="ring-core" cx="110" cy="110" r="55" fill="#fbfdfb" stroke="#eef4ef" stroke-width="1" />
              <circle cx="110" cy="110" r="84" fill="none" stroke="#edf0eb" stroke-width="17" />
              <circle cx="110" cy="110" r="84" fill="none" stroke="#bde6d4" stroke-width="17" stroke-dasharray="105 528"
                stroke-dashoffset="90" stroke-linecap="round" />
              <circle cx="110" cy="110" r="84" fill="none" stroke="#64bd94" stroke-width="17" stroke-dasharray="132 528"
                stroke-dashoffset="-38" stroke-linecap="round" />
              <circle cx="110" cy="110" r="84" fill="none" stroke="#d5eee2" stroke-width="17" stroke-dasharray="78 528"
                stroke-dashoffset="-206" stroke-linecap="round" />
              <line x1="110" y1="110" x2="160" y2="61" stroke="#264638" stroke-width="2" stroke-linecap="round" />
              <circle cx="110" cy="110" r="5" fill="#264638" />
              <circle cx="160" cy="61" r="4" fill="#77c49e" /><text x="110" y="103" text-anchor="middle"
                class="ring-time">{{ formatClock(current) }}</text><text x="110" y="124" text-anchor="middle"
                class="ring-caption">当前播放</text>
            </svg></div>
          <div class="cycle-legend">
            <button v-for="(dose, index) in schedule.slice(0, 3)" :key="`${dose.time}-${index}`"
              class="legend-item" @click="seekSegment(dose.segmentId)">
              <span class="legend-dot dose"></span><span>{{ dose.time }}</span><b>{{ dose.title }}</b>
            </button>
            <div v-if="!schedule.length" class="legend-item">
              <span class="legend-dot dose"></span><span>服药时间</span><b>未提及</b>
            </div>
            <div class="cycle-note">
              <Activity :size="14" /> 点击时间可定位原声
            </div>
          </div>
        </div>
      </div>
      <div class="right-stack">
        <div v-if="warnings.length" class="alert-card">
          <div class="alert-top"><span class="alert-symbol">!</span><span>用药安全提醒</span><span class="alert-critical">重要</span></div>
          <p>{{ warnings[0].text }}</p>
          <button v-if="warnings[0].segmentId" @click="seekSegment(warnings[0].segmentId)">
            <Volume2 :size="13" /> 听医生原声
          </button>
        </div>
        <div class="adherence-card">
          <div class="adherence-top">
            <div><span class="tiny-label">MEDICATION PLAN</span>
              <h4>服药安排</h4>
            </div><span class="adherence-percent">{{ schedule.length }}<small> 次</small></span>
          </div>
          <div class="adherence-bar"><i :style="{ width: checked ? '100%' : '0%' }"></i></div>
          <div class="adherence-foot"><span>{{ checked ? '已确认首次服药' : '尚未确认服药' }}</span><span>{{ payload.medication.dose }}</span></div>
        </div>
      </div>
    </div>
    <div class="dose-action-row">
      <div class="dose-next"><span class="dose-check">
          <Check :size="15" />
        </span>
        <div><span>服药计划</span><b>{{ schedule[0]?.time || '未提及' }} <small v-if="schedule[0]">· {{ schedule[0].title }}</small></b></div>
      </div><button class="confirm-dose" @click="emit('toggleDose')">
        <Check :size="15" /> {{ checked ? '已确认服药' : '确认已服药' }}
      </button>
    </div>
    <div class="transcript-block">
      <div class="transcript-heading">
        <div><span class="tiny-label">VOICE TRANSCRIPT</span>
          <h4>医嘱原文</h4>
        </div><button @click="exportTranscript">
          <ArrowDownToLine :size="14" /> 导出文字
        </button>
      </div>
      <div class="transcript-lines">
        <button v-for="(line, i) in transcript" :key="line.id"
          :class="['transcript-line', { highlighted: activeSegment === i }]" @click="emit('seek', line.start)">
          <span class="line-time">{{ formatClock(line.start) }}</span><span>{{ line.text }}</span>
          <Volume2 v-if="activeSegment === i" :size="14" />
        </button>
        <p v-if="!transcript.length" class="transcript-empty">尚未转写，请在右侧展开听力原文并触发转写。</p>
      </div>
    </div>
  </div>
</template>
<style>
.med-overview {
    padding: 1px 2px 15px;
    border-bottom: 1px solid #eff2ef;
}

.med-label {
    font-size: 12px;
    color: #97a19a;
}

.med-label span {
    padding: 0 5px;
    color: #c1c9c3;
}

.med-drug {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
}

.pill-mark {
    width: 31px;
    height: 31px;
    border-radius: 9px;
    background: #f0f6ed;
    color: #86a776;
    display: grid;
    place-items: center;
    font-size: 20px;
}

.med-drug h3 {
    font-size: 16px;
    margin: 0 0 2px;
    font-weight: 600;
}

.med-drug p {
    font-size: 12px;
    color: #a2aaa4;
    margin: 0;
}

.med-tags {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 11px 0 0 41px;
    font-size: 12px;
    color: #848f87;
}

.med-tags b {
    color: #4b5c50;
    font-weight: 600;
}

.med-tags i {
    height: 3px;
    width: 3px;
    border-radius: 50%;
    background: #c1cac3;
}

.med-main-grid {
    display: grid;
    grid-template-columns: 1.18fr .82fr;
    gap: 12px;
    padding-top: 15px;
}

.cycle-card,
.adherence-card {
    border: 1px solid #edf1ed;
    border-radius: 9px;
    background: #fff;
}

.cycle-card {
    padding: 13px 13px 10px;
}

.mini-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mini-heading h4,
.adherence-top h4 {
    font-size: 13px;
    margin: 4px 0 0;
    font-weight: 600;
}

.adherence-top h4 {
    margin-top: 3px;
}

.date-chip {
    border: 1px solid #edf0ed;
    border-radius: 5px;
    padding: 4px 6px;
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 10px;
    color: #87928a;
}

.cycle-layout {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    padding-left: 5px;
    margin-top: 4px;
}

.cycle-wrap {
    width: 55%;
    max-width: 194px;
    margin-left: 4px;
    transform: translateX(4px);
}

.cycle-svg {
    width: 100%;
    display: block;
    overflow: visible;
}

.ring-guide {
    opacity: .55;
}

.ring-time {
    font: 700 20px Manrope, sans-serif;
    fill: #35463a;
}

.ring-caption {
    font: 11px 'Noto Sans SC', sans-serif;
    fill: #a0aaa3;
}

.cycle-legend {
    flex: 1;
    min-width: 118px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.legend-item {
    display: grid;
    grid-template-columns: 8px 1fr;
    gap: 4px 8px;
    align-items: center;
    font-size: 12px;
    color: #929d95;
    padding: 7px 8px;
    border: 1px solid #eef3ee;
    border-radius: 7px;
    background: #fbfdfb;
    text-align: left;
    width: 100%;
}

.legend-item b {
    grid-column: 2;
    font-size: 13px;
    color: #56645a;
    font-weight: 600;
}

.legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    grid-row: span 2;
}

.legend-dot.dose {
    background: #65b485;
}

.cycle-note {
    font-size: 12px;
    color: #57926a;
    background: #f2f8f3;
    border-radius: 5px;
    padding: 7px;
    display: flex;
    gap: 5px;
    align-items: center;
    margin-top: 1px;
}

.right-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.alert-card {
    background: #fff9f6;
    border: 1px solid #f7e9e2;
    border-radius: 9px;
    padding: 11px 12px;
}

.alert-top {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 10px;
    color: #6b5148;
    font-weight: 600;
}

.alert-critical {
    margin-left: auto;
    color: #c28269;
    background: #f9ebe4;
    border-radius: 4px;
    padding: 3px 5px;
    font-size: 9px;
    letter-spacing: 1px;
}

.alert-card p {
    font-size: 10px;
    color: #8d746b;
    line-height: 1.7;
    margin: 8px 0;
}

.alert-card button {
    border-top: 1px solid #f2e7e1;
    padding: 8px 0 0;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: #ae7967;
    text-align: left;
}

.adherence-card {
    padding: 11px 12px;
    background: #fbfcfb;
}

.adherence-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.adherence-percent {
    font: 700 22px Manrope, sans-serif;
    color: #4d8e64;
}

.adherence-percent small {
    font: 500 12px Manrope, sans-serif;
}

.adherence-bar {
    height: 4px;
    border-radius: 4px;
    background: #e9efe9;
    margin: 11px 0 7px;
}

.adherence-bar i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: #76b78a;
    transition: width .2s ease;
}

.adherence-foot {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #99a39c;
}

.dose-action-row {
    margin-top: 17px;
    background: #f7faf7;
    border: 1px solid #edf2ed;
    border-radius: 8px;
    padding: 9px 11px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.dose-next {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dose-check {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    background: #e9f4eb;
    color: #67a478;
    border-radius: 7px;
}

.dose-next div {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.dose-next div span {
    font-size: 10px;
    color: #9ba59e;
}

.dose-next b {
    font-size: 12px;
    font-weight: 600;
}

.dose-next b small {
    font-size: 10px;
    color: #99a39c;
    font-weight: 400;
}

.confirm-dose {
    background: #e8f3eb;
    color: #4e895f;
    border-radius: 6px;
    padding: 7px 9px;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.transcript-block {
    margin-top: 20px;
}

.transcript-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.transcript-heading h4 {
    margin: 3px 0 0;
    font-size: 13px;
}

.transcript-heading button {
    font-size: 9px;
    color: #89958d;
    display: flex;
    gap: 5px;
    align-items: center;
}

.transcript-lines {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.transcript-line {
    display: grid;
    grid-template-columns: 44px 1fr 15px;
    text-align: left;
    align-items: center;
    gap: 7px;
    padding: 7px 8px;
    border-radius: 5px;
    color: #717d74;
    font-size: 11px;
    line-height: 1.45;
}

.transcript-line.highlighted {
    background: #f0f7f1;
    color: #3f704f;
}

.transcript-line svg {
    color: #69a37a;
}

.line-time {
    font: 10px Manrope, sans-serif;
    color: #9daa9f;
}

.transcript-empty {
    font-size: 12px;
    color: #9aa49d;
    padding: 10px 4px;
}

@media(max-width:1000px) {
    .med-main-grid {
        grid-template-columns: 1fr;
    }

    .right-stack {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .cycle-layout {
        justify-content: flex-start;
    }
}

@media(max-width:720px) {
    .med-main-grid {
        grid-template-columns: 1fr;
    }

    .cycle-layout {
        justify-content: center;
    }

    .cycle-wrap {
        max-width: 205px;
        margin-left: 4px;
        transform: translateX(4px);
    }

    .right-stack {
        grid-template-columns: 1fr 1fr;
    }
}
</style>
