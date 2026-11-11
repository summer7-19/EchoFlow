<script setup lang="ts">
import { ChevronDown, Pause, Play, Sparkles, Waves, MoreHorizontal, ChevronUp } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  title: string
  playing: boolean
  current: number
  duration: number
  elapsed: string
  progress: number
  src?: string
  fileName?: string
  createdAt?: string
  status?: string
  error?: string
}>()

const emit = defineEmits<{
  (event: 'toggle'): void
  (event: 'seekBy', amount: number): void
  (event: 'scrub', value: Event): void
  (event: 'timeUpdate', current: number): void
  (event: 'durationChange', duration: number): void
  (event: 'ended'): void
}>()

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const speedMenuOpen = ref(false)
const speed = ref(1)
const audioElement = ref<HTMLAudioElement>()

const totalTime = computed(() => formatClock(props.duration))
const statusText = computed(() => {
  const labels: Record<string, string> = {
    UPLOADED: '待解析',
    TRANSCRIBING: '转写中',
    PARSED: '已解析',
    FAILED: '解析失败',
  }
  return props.status ? labels[props.status] ?? props.status : '等待上传'
})

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function waveHeight(index: number) {
  return `${8 + ((index * 17 + index * index * 3) % 20)}px`
}

watch(
  () => props.src,
  () => {
    const audio = audioElement.value
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    audio.load()
  },
)

watch(
  () => props.playing,
  playing => {
    const audio = audioElement.value
    if (!audio || !props.src) return
    if (playing) void audio.play()
    else audio.pause()
  },
)

// Keep the media element in sync when the parent seeks.
watch(
  () => props.current,
  value => {
    const audio = audioElement.value
    if (audio && Math.abs(audio.currentTime - value) > 0.4) audio.currentTime = value
  },
)

watch(speed, value => {
  if (audioElement.value) audioElement.value.playbackRate = value
})
</script>
<template>
  <div class="workbench-head">
    <audio ref="audioElement" :src="src" preload="metadata" @timeupdate="emit('timeUpdate', ($event.target as HTMLAudioElement).currentTime)" @loadedmetadata="emit('durationChange', ($event.target as HTMLAudioElement).duration)" @ended="emit('ended')" />
    <div class="recording-title"><span class="record-icon">
        <Waves :size="19" />
      </span>
      <div>
        <div class="record-title-line">
          <h3>{{ title }}</h3><span class="status-pill"><i></i> {{ statusText }}</span>
        </div>
        <div class="record-meta"><span>{{ fileName || '暂无音频' }}</span><b>·</b><span>{{ createdAt || '等待上传' }}</span><b>·</b><span>{{ elapsed }}</span><span v-if="error" class="record-error">{{ error }}</span></div>
      </div>
    </div>
    <div class="head-player"><button class="skip-btn" @click="emit('seekBy', -10)">↶<small>10</small></button><button
        class="play-btn" @click="emit('toggle')">
        <Pause v-if="playing" :size="15" fill="currentColor" />
        <Play v-else :size="15" fill="currentColor" />
      </button><button class="skip-btn" @click="emit('seekBy', 10)">↷<small>10</small></button>
      <div class="head-wave"><span>{{ elapsed }}</span>
        <div class="head-wave-track"><i v-for="n in 44" :key="n"
            :style="{ height: waveHeight(n) }"
            :class="{ played: n / 44 * 100 < progress, anchor: [10, 24, 35].includes(n) }"></i><input type="range"
            min="0" :max="duration" :value="current" @input="emit('scrub', $event)" aria-label="音频进度" /></div>
        <span>{{ totalTime }}</span>
      </div>
      <div class="speed-selector"><button
          class="head-speed" :aria-expanded="speedMenuOpen" @click="speedMenuOpen = !speedMenuOpen">
          {{ speed }}×
          <ChevronUp :size="12" v-if="speedMenuOpen" />
          <ChevronDown :size="12" v-else />
        </button>
        <div v-if="speedMenuOpen" class="speed-menu"><button v-for="rate in SPEEDS" :key="rate"
            :class="{ active: rate === speed }" @click="speed = rate; speedMenuOpen = false">{{ rate }}×</button></div>
      </div>
    </div>
    <div class="head-right"><span class="ai-badge">
        <Sparkles :size="13" /> AI 已识别 <b>·</b> {{ statusText }}
      </span><button class="icon-btn">
        <MoreHorizontal :size="20" />
      </button></div>
  </div>
</template>
<style>
.workbench-head {
    min-height: 78px;
    height: auto;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    border-bottom: 1px solid #eef1ee;
    position: relative;
    z-index: 1;
    border-radius: 12px 12px 0 0;
    background: #fff;
}

.recording-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.record-icon {
    width: 36px;
    height: 36px;
    background: #edf6ef;
    color: #5e9c71;
    display: grid;
    place-items: center;
    border-radius: 10px;
}

.record-title-line {
    display: flex;
    align-items: center;
    gap: 9px;
}

.record-title-line h3 {
    font-size: 16px;
    margin: 0;
    font-weight: 600;
}

.status-pill {
    font-size: 11px;
    color: #55916a;
    background: #eff7f0;
    padding: 4px 7px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.status-pill i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #6fb181;
}

.record-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #9aa49d;
    font-size: 12px;
    margin-top: 6px;
}

.record-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
}

.record-meta b {
    font-weight: 400;
    color: #c8ceca;
}

.record-error {
    color: #b85d4e;
}

.head-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.ai-badge {
    font-size: 11px;
    color: #829189;
    background: #f7f9f7;
    border: 1px solid #eef1ee;
    border-radius: 20px;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.ai-badge svg {
    color: #7aab84;
}

.ai-badge b {
    color: #d1d7d2;
    font-weight: 400;
}

.head-player {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    max-width: 580px;
    min-width: 280px;
    padding: 0 14px;
    border-left: 1px solid #edf0ed;
    font-size: 12px;
}

.head-wave {
    display: grid;
    grid-template-columns: 40px minmax(80px, 1fr) 40px;
    align-items: center;
    gap: 8px;
    flex: 1;
    font: 11px Manrope, sans-serif;
    color: #929e95;
}

.head-wave-track {
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    position: relative;
    overflow: hidden;
}

.head-wave-track i {
    width: 3px;
    min-width: 2px;
    border-radius: 3px;
    background: #dbe8de;
    z-index: 0;
}

.head-wave-track i.played {
    background: #7eaf89;
}

.head-wave-track i.anchor {
    background: #d6a07a;
}

.head-wave-track input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 2;
}

.play-btn {
    width: 31px;
    height: 31px;
    border-radius: 50%;
    background: #3d754f;
    color: white;
    display: grid;
    place-items: center;
}

.skip-btn {
    font-size: 17px;
    color: #7b887e;
    position: relative;
    line-height: 1;
}

.skip-btn small {
    position: absolute;
    font: 7px Manrope, sans-serif;
    left: 5px;
    top: 6px;
}

.head-player .skip-btn {
    font-size: 19px;
}

.head-player .skip-btn small {
    font-size: 9px;
    left: 9px;
    top: 10px;
}

.head-speed {
    font: 11px 'DM Sans', 'Noto Sans SC', sans-serif;
    color: #78857c;
    border: 1px solid #edf0ed;
    border-radius: 5px;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    border-color: rgb(232, 238, 232);
}

.speed-selector {
    position: relative;
    z-index: 60;
}

.speed-menu {
    position: absolute;
    z-index: 20;
    bottom: calc(100% + 8px);
    right: 0;
    min-width: 80px;
    padding: 5px;
    background: #fff;
    border: 1px solid #e8eee8;
    border-radius: 8px;
    box-shadow: 0 10px 24px #26372d1a;
}

.speed-menu button {
    display: block;
    width: 100%;
    padding: 7px 10px;
    text-align: center;
    border-radius: 5px;
    font-size: 11px;
    color: #66736a;
}

.speed-menu button:hover,
.speed-menu button.active {
    background: #eff6f0;
    color: #4c865d;
    font-weight: 600;
}

@media(max-width:900px) {
    .head-player {
        min-width: 220px;
        padding: 0 8px;
        gap: 7px;
        font-size: 11px;
    }

    .head-wave {
        grid-template-columns: 34px minmax(50px, 1fr) 34px;
    }
}

@media(max-width:720px) {
    .head-right,
    .record-meta {
        display: none;
    }

    .workbench-head {
        min-height: 104px;
        flex-wrap: wrap;
        gap: 7px;
        padding: 10px 12px;
    }

    .recording-title {
        width: 100%;
    }

    .head-player {
        border: 0;
        padding: 0;
        width: 100%;
        max-width: none;
        min-width: 0;
        gap: 6px;
        font-size: 10px;
    }

    .head-wave {
        font-size: 9px;
        grid-template-columns: 28px minmax(35px, 1fr) 28px;
    }

    .head-player .skip-btn small {
        left: 7px;
    }
}
</style>
