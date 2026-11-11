<script setup lang="ts">
import { computed } from 'vue'
import type { AudioRecord } from '../../api/audio'
import type { TimelineEvent } from '../../api/schedule'

const props = defineProps<{
  items: AudioRecord[]
  events: TimelineEvent[]
}>()

function daysAgo(count: number) {
  const days: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(new Date(today.getTime() - offset * 86_400_000))
  }
  return days
}

function isSameDay(value: string, day: Date) {
  const date = new Date(value)
  return date.getFullYear() === day.getFullYear()
    && date.getMonth() === day.getMonth()
    && date.getDate() === day.getDate()
}

const monthCount = computed(() => {
  const now = new Date()
  return props.items.filter(item => {
    const date = new Date(item.createdAt)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }).length
})

const dailyCounts = computed(() => daysAgo(12).map(day =>
  props.items.filter(item => isSameDay(item.createdAt, day)).length,
))
const weekCounts = computed(() => daysAgo(7).map(day =>
  props.items.filter(item => isSameDay(item.createdAt, day)).length,
))
const weekTotal = computed(() => weekCounts.value.reduce((total, value) => total + value, 0))
const activeDays = computed(() => weekCounts.value.filter(value => value > 0).length)

function audioSeconds(item: AudioRecord) {
  if (item.duration) return item.duration
  return item.transcript.reduce((max, segment) => Math.max(max, segment.end), 0)
}

const totalSeconds = computed(() =>
  props.items.reduce((total, item) => total + audioSeconds(item), 0),
)
const listenedHours = computed(() => totalSeconds.value / 3600)
const parsedCount = computed(() => props.items.filter(item => item.status === 'PARSED').length)

const pendingCount = computed(() => props.events.filter(event => event.status === 'PENDING').length)
const completedCount = computed(() => props.events.filter(event => event.status === 'COMPLETED').length)
const donutPercent = computed(() => {
  const total = pendingCount.value + completedCount.value
  return total ? Math.round((completedCount.value / total) * 100) : 0
})
const donutDash = computed(() => `${(donutPercent.value * 1.696).toFixed(1)} 170`)

const barHeights = computed(() => {
  const max = Math.max(...dailyCounts.value, 1)
  return dailyCounts.value.map(value => (value ? Math.max(12, Math.round((value / max) * 100)) : 6))
})

function trendPoints(values: number[]) {
  const width = 120
  const top = 6
  const bottom = 58
  const max = Math.max(...values, 1)
  return values.map((value, index) => {
    const x = values.length <= 1 ? width : (index / (values.length - 1)) * width
    const y = bottom - (value / max) * (bottom - top)
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
  })
}

const linePoints = computed(() => trendPoints(weekCounts.value))
const linePath = computed(() =>
  linePoints.value.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' '),
)
const lineAreaPath = computed(() => `${linePath.value} V64 H0Z`)
const lastPoint = computed(() => linePoints.value[linePoints.value.length - 1] ?? { x: 120, y: 58 })
</script>
<template>
  <section class="stats-row">
    <div class="stat-card">
      <div class="stat-copy"><span class="stat-label">本月解析</span><b>{{ monthCount }} <small>段音频</small></b><span
          class="stat-caption">近 7 日新增 {{ weekTotal }} 段</span></div>
      <div class="stat-chart chart-bars">
        <div v-for="(height, i) in barHeights" :key="i" class="bar-column"><i :style="{ height: `${height}%` }"></i>
        </div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-copy"><span class="stat-label">聆听时长</span><b>{{ listenedHours.toFixed(1) }} <small>小时</small></b><span
          class="stat-caption positive">已解析 {{ parsedCount }} 段</span></div>
      <div class="stat-chart chart-line"><svg viewBox="0 0 120 64" preserveAspectRatio="none" aria-label="近 7 日录音趋势">
          <defs>
            <linearGradient id="listenFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#aa9bd2" stop-opacity=".24" />
              <stop offset="1" stop-color="#aa9bd2" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path class="line-area" :d="lineAreaPath" />
          <path class="line-stroke" :d="linePath" />
        </svg></div>
    </div>
    <div class="stat-card">
      <div class="stat-copy"><span class="stat-label">待完成事项</span><b>{{ pendingCount }} <small>项待办</small></b><span
          class="stat-caption">已完成 {{ completedCount }} 项</span></div>
      <div class="stat-chart chart-donut"><svg viewBox="0 0 72 72" aria-label="待办完成比例">
          <circle cx="36" cy="36" r="27" />
          <circle class="donut-progress" cx="36" cy="36" r="27" :style="{ strokeDasharray: donutDash }" />
        </svg><span>{{ donutPercent }}%</span></div>
    </div>
    <div class="stat-card streak-card">
      <div class="stat-copy"><span class="stat-label">专注记录</span><b>{{ activeDays }} <small>天活跃</small></b><span
          class="stat-caption positive">近 7 日上传记录</span></div>
      <div class="stat-chart chart-spark"><svg viewBox="0 0 120 64" preserveAspectRatio="none" aria-label="近 7 日活跃趋势">
          <path class="spark-guide" d="M0 53H120" />
          <path class="spark-line" :d="linePath" />
          <circle :cx="lastPoint.x" :cy="lastPoint.y" r="3" />
        </svg></div>
    </div>
  </section>
</template>
<style>
.stats-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px 20px;
    margin-bottom: 32px;
}

.stat-card {
    height: 120px;
    min-width: 0;
    background: #fff;
    border: 1px solid #edf0ed;
    border-radius: 10px;
    padding: 16px 17px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    overflow: hidden;
}

.stat-copy {
    position: relative;
    z-index: 1;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.stat-label {
    font-size: 15px;
    color: #909a94;
}

.stat-copy>b {
    font: 700 27px Manrope, sans-serif;
    color: #344038;
    text-indent: 1rem;
}

.stat-copy small {
    font: 500 15px 'Noto Sans SC', sans-serif;
    color: #9aa29d;
    margin-left: 2px;
}

.stat-caption {
    font-size: 12px;
    color: #a0aaa2;
}

.stat-caption.positive {
    color: #6da37a;
    margin-top: 2px;
}

.stat-chart {
    position: absolute;
    right: 13px;
    bottom: 13px;
    width: 43%;
    height: 64px;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    color: #6caa7e;
}

.chart-bars {
    gap: 3px;
}

.bar-column {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
    background: linear-gradient(to top, #f1f6f1 1px, transparent 1px);
    background-size: 100% 25%;
    border-radius: 4px 4px 0 0;
}

.bar-column i {
    display: block;
    width: 100%;
    border-radius: 4px 4px 1px 1px;
    background: linear-gradient(180deg, #acd3b3, #d9ebdc);
    transition: filter .18s ease, transform .18s ease;
    transform-origin: bottom;
}

.bar-column:nth-child(3n) i {
    background: linear-gradient(180deg, #79b789, #b9ddc0);
}

.stat-card:hover .bar-column i {
    filter: saturate(1.12);
}

.chart-line svg,
.chart-spark svg {
    width: 100%;
    height: 100%;
    overflow: visible;
}

.chart-line .line-area {
    fill: url(#listenFill);
}

.chart-line .line-stroke {
    fill: none;
    stroke: #9a8cc4;
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
}

.chart-donut {
    width: 66px;
    height: 66px;
    right: 17px;
    bottom: 14px;
    display: grid;
    place-items: center;
}

.chart-donut svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    overflow: visible;
}

.chart-donut circle {
    fill: none;
    stroke: #f2ece7;
    stroke-width: 8;
}

.chart-donut circle.donut-progress {
    stroke: #d4a27c;
    stroke-linecap: round;
    transition: stroke-dasharray .2s ease;
}

.chart-donut span {
    position: absolute;
    font: 700 12px Manrope, sans-serif;
    color: #a27d63;
    letter-spacing: .2px;
}

.chart-spark {
    height: 58px;
    width: 42%;
}

.chart-spark .spark-guide {
    stroke: #e9efe9;
    stroke-dasharray: 3 4;
}

.chart-spark .spark-line {
    fill: none;
    stroke: #78ad83;
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
}

.chart-spark circle {
    fill: #5c9e6b;
    stroke: #fff;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
}

@media(max-width:1050px) {
    .stats-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media(max-width:720px) {
    .stats-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 26px;
    }

    .stat-card {
        height: 108px;
        padding: 12px;
    }

    .stat-copy>b {
        font-size: 24px;
    }

    .stat-chart {
        width: 40%;
        height: 52px;
        right: 9px;
        bottom: 9px;
    }

    .chart-donut {
        width: 54px;
        height: 54px;
    }
}
</style>
