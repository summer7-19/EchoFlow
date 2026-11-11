<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDownToLine, ArrowLeft, ArrowRight, Plus } from 'lucide-vue-next'
import TopBar from '../components/layout/TopBar.vue'
import StatsRow from '../components/dashboard/StatsRow.vue'
import RecentRecordings from '../components/dashboard/RecentRecordings.vue'
import WorkbenchPlayer from '../components/player/WorkbenchPlayer.vue'
import SceneTabs from '../components/workbench/SceneTabs.vue'
import MedicationScene from '../components/workbench/MedicationScene.vue'
import SopScene from '../components/workbench/SopScene.vue'
import QuizScene from '../components/workbench/QuizScene.vue'
import MemoScene from '../components/workbench/MemoScene.vue'
import InterviewScene from '../components/workbench/InterviewScene.vue'
import TranscriptScene from '../components/workbench/TranscriptScene.vue'
import ContextPanel from '../components/workbench/ContextPanel.vue'
import UploadModal from '../components/modals/UploadModal.vue'
import { useWorkbench } from '../composables/useWorkbench'
import type { Scene } from '../composables/useWorkbench'
import { useSplitPane } from '../composables/useSplitPane'
import { KIND_BY_SCENE, sceneForCategory } from '../utils/scenes'
import { printScenePdf } from '../utils/export'
import { getCurrentUser, logout } from '../api/auth'
import { deleteAudio, fetchAudioBlob, listAudios } from '../api/audio'
import type { AudioRecord } from '../api/audio'
import { getScene, parseScene } from '../api/scenes'
import type { ScenePayload } from '../api/scenes'
import { listScheduleEvents } from '../api/schedule'
import type { TimelineEvent } from '../api/schedule'
import { transcribeAudio } from '../api/transcribe'
import type { TranscribeSegment } from '../api/transcribe'
import type {
  InterviewPayload,
  MedicationPayload,
  MemoPayload,
  QuizPayload,
  SopPayload,
  TranscriptPayload,
} from '../types/scenes'
import type { AuthUser } from '../api/client'

const router = useRouter()

const user = ref<AuthUser>()
const search = ref('')
const questionIndex = ref(0)
const showUpload = ref(false)
const uploaded = ref(false)
const popoverOpen = ref(false)

const audios = ref<AudioRecord[]>([])
const selectedAudio = ref<AudioRecord>()
const audioSource = ref('')
const audioDuration = ref(0)
const audioError = ref('')

const transcript = ref<TranscribeSegment[]>([])
const transcribing = ref(false)
const transcriptError = ref('')

const scenePayload = ref<ScenePayload>()
const sceneLoading = ref(false)
const sceneError = ref('')
const scheduleEvents = ref<TimelineEvent[]>([])

const {
  scene,
  playing,
  current,
  checked,
  selected,
  activeSegment,
  togglePlay,
  seek,
  scrub,
  tick,
  toggleChecked,
} = useWorkbench(transcript)

const {
  containerRef,
  dividerRef,
  mainRatio,
  isSwapped,
  isResizing,
  paneStyle,
  toggleSplit,
  resetSplit,
  startDividerPress,
  moveDivider,
  endDividerPress,
  cancelDividerPress,
} = useSplitPane()

const duration = computed(() => audioDuration.value || selectedAudio.value?.duration || 0)
const elapsed = computed(() => formatClock(current.value))
const progress = computed(() => (duration.value ? (current.value / duration.value) * 100 : 0))

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const medicationPayload = computed<MedicationPayload | null>(() =>
  scene.value === 'medication' && scenePayload.value?.category === 'MEDICATION'
    ? scenePayload.value.payload
    : null,
)
const sopPayload = computed<SopPayload | null>(() =>
  scene.value === 'sop' && scenePayload.value?.category === 'SOP'
    ? scenePayload.value.payload
    : null,
)
const quizPayload = computed<QuizPayload | null>(() =>
  scene.value === 'quiz' && scenePayload.value?.category === 'QUIZ'
    ? scenePayload.value.payload
    : null,
)
const memoPayload = computed<MemoPayload | null>(() =>
  scene.value === 'memo' && scenePayload.value?.category === 'MEMO'
    ? scenePayload.value.payload
    : null,
)
const interviewPayload = computed<InterviewPayload | null>(() =>
  scene.value === 'interview' && scenePayload.value?.category === 'INTERVIEW'
    ? scenePayload.value.payload
    : null,
)
const transcriptPayload = computed<TranscriptPayload | null>(() =>
  scene.value === 'transcript' && scenePayload.value?.category === 'TRANSCRIPT'
    ? scenePayload.value.payload
    : null,
)
const footerKind = computed(() =>
  selectedAudio.value?.category
    ? KIND_BY_SCENE[sceneForCategory(selectedAudio.value.category)]
    : '未分类',
)
const footerDuration = computed(() => formatDuration(duration.value))
const todayLabel = new Date()
  .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  .toUpperCase()

function formatDuration(seconds: number) {
  if (!seconds) return '--'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes} 分 ${String(remainder).padStart(2, '0')} 秒`
}

void getCurrentUser()
  .then(result => {
    user.value = result.user
  })
  .catch(() => {
    logout()
    void router.replace('/login')
  })

void refreshAudios()
void refreshSchedule()

async function refreshAudios() {
  try {
    audios.value = await listAudios()
  } catch {
    audios.value = []
  }
}

async function refreshSchedule() {
  try {
    scheduleEvents.value = await listScheduleEvents()
  } catch {
    scheduleEvents.value = []
  }
}

async function fetchScene(audioId: string) {
  try {
    return await getScene(audioId)
  } catch {
    return undefined
  }
}

function applyScene(payload: ScenePayload) {
  scenePayload.value = payload
  sceneError.value = ''
  scene.value = sceneForCategory(payload.category)
  if (selectedAudio.value) {
    selectedAudio.value.category = payload.category
    selectedAudio.value.status = 'PARSED'
  }
  const listItem = audios.value.find(item => item.audioId === payload.audioId)
  if (listItem) {
    listItem.category = payload.category
    listItem.status = 'PARSED'
  }
}

async function loadScene(audioId: string) {
  sceneLoading.value = true
  sceneError.value = ''
  scenePayload.value = undefined

  let payload = await fetchScene(audioId)

  // 上传后的解析由后端队列异步执行，未完成时短暂轮询场景结果。
  const audio = selectedAudio.value
  const waitingForPipeline = audio?.audioId === audioId
    && (audio.status === 'UPLOADED' || audio.status === 'TRANSCRIBING')

  for (let attempt = 0; waitingForPipeline && !payload && attempt < 60; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (selectedAudio.value?.audioId !== audioId) return
    payload = await fetchScene(audioId)
  }

  if (selectedAudio.value?.audioId !== audioId) return
  if (payload) applyScene(payload)
  else sceneError.value = '该录音暂无解析结果'
  sceneLoading.value = false
}

async function startParsing(audioId: string) {
  if (sceneLoading.value) return
  sceneLoading.value = true
  sceneError.value = ''

  try {
    await parseScene(audioId, true)
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      if (selectedAudio.value?.audioId !== audioId) return
      const payload = await fetchScene(audioId)
      if (payload) {
        applyScene(payload)
        return
      }
    }
    sceneError.value = '解析超时，请稍后重新打开该录音'
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : '解析失败'
  } finally {
    if (selectedAudio.value?.audioId === audioId) sceneLoading.value = false
  }
}

function reparse() {
  const item = selectedAudio.value
  if (item) void startParsing(item.audioId)
}

function exportScene() {
  if (!selectedAudio.value || !scenePayload.value) return
  printScenePdf(selectedAudio.value, scenePayload.value, transcript.value)
}

function resetWorkbench() {
  if (audioSource.value) URL.revokeObjectURL(audioSource.value)
  audioSource.value = ''
  audioError.value = ''
  selectedAudio.value = undefined
  transcript.value = []
  transcriptError.value = ''
  transcribing.value = false
  scenePayload.value = undefined
  sceneError.value = ''
  sceneLoading.value = false
  current.value = 0
  audioDuration.value = 0
  playing.value = false
  checked.value = []
  selected.value = ''
  questionIndex.value = 0
  uploaded.value = false
}

async function removeAudio(item: AudioRecord) {
  const confirmed = window.confirm(
    `确定删除「${item.originalName}」吗？\n该录音的解析结果、字幕和日程将一并删除，且无法恢复。`,
  )
  if (!confirmed) return

  try {
    await deleteAudio(item.audioId)
    audios.value = audios.value.filter(audio => audio.audioId !== item.audioId)
    if (selectedAudio.value?.audioId === item.audioId) resetWorkbench()
    await refreshSchedule()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '删除录音失败')
  }
}

function toggleTodo(index: number, value: boolean) {
  checked.value[index] = value
}

function navigateQuestion(direction: number) {
  const total = quizPayload.value?.questions.length ?? 0
  if (!total) return
  questionIndex.value = Math.max(0, Math.min(total - 1, questionIndex.value + direction))
  selected.value = ''
}

async function openAudio(item: AudioRecord) {
  if (audioSource.value) URL.revokeObjectURL(audioSource.value)

  audioSource.value = ''
  audioError.value = ''
  selectedAudio.value = item
  uploaded.value = true
  current.value = 0
  audioDuration.value = item.duration ?? 0
  transcript.value = [...item.transcript]
  transcriptError.value = ''
  transcribing.value = false
  checked.value = []
  selected.value = ''
  questionIndex.value = 0
  scene.value = sceneForCategory(item.category)
  scenePayload.value = undefined
  void loadScene(item.audioId)

  try {
    const blob = await fetchAudioBlob(item.audioId)
    audioSource.value = URL.createObjectURL(blob)
  } catch (error) {
    audioError.value = error instanceof Error ? error.message : '无法载入音频'
  }
}

async function loadTranscript() {
  if (transcript.value.length || transcribing.value) return

  const item = selectedAudio.value
  if (!item) {
    transcriptError.value = '请先选择一条录音'
    return
  }

  transcribing.value = true
  transcriptError.value = ''

  try {
    const result = await transcribeAudio(item.audioId)
    item.transcript = result.segments
    item.status = 'PARSED'
    if (selectedAudio.value?.audioId === item.audioId) {
      transcript.value = result.segments
      if (!scenePayload.value) void startParsing(item.audioId)
    }
  } catch (error) {
    if (selectedAudio.value?.audioId === item.audioId) {
      transcriptError.value = error instanceof Error ? error.message : '语音转写失败'
    }
  } finally {
    transcribing.value = false
  }
}

function signOut() {
  logout()
  void router.replace('/login')
}

onUnmounted(() => {
  if (audioSource.value) URL.revokeObjectURL(audioSource.value)
})
</script>
<template>
    <div class="app-shell" :class="{ 'popover-open': popoverOpen }">
        <TopBar :user="user" @user-updated="user = $event" @search="search = $event" @logout="signOut"
            @popover-change="popoverOpen = $event" />
        <main class="workspace">
            <div class="welcome-row">
                <div>
                    <div class="eyebrow"><span class="eyebrow-line"></span>{{ todayLabel }} <span
                            class="eyebrow-dot">·</span></div>
                    <h1>让每一段声音，<em>都有迹可循。</em></h1>
                    <p class="welcome-sub">从一段录音开始，整理灵感、行动与每一个重要时刻。</p>
                </div><button class="primary-btn upload-top" @click="showUpload = true">
                    <Plus :size="17" /> 新建音频解析 <span class="shortcut">⌘ K</span>
                </button>
            </div>
            <StatsRow :items="audios" :events="scheduleEvents" />
            <RecentRecordings v-model:search="search" :items="audios" @open="openAudio" @delete="removeAudio" />
            <section class="workbench-card">
                <WorkbenchPlayer :title="selectedAudio?.originalName || (uploaded ? '新上传的录音' : '选择一条录音开始')"
                    :src="audioSource" :file-name="selectedAudio?.originalName" :created-at="selectedAudio?.createdAt"
                    :status="selectedAudio?.status" :error="audioError" :playing="playing" :current="current"
                    :duration="duration" :elapsed="elapsed" :progress="progress" @toggle="togglePlay"
                    @seek-by="current = Math.max(0, Math.min(duration, current + $event))" @scrub="scrub"
                    @time-update="current = $event" @duration-change="audioDuration = $event"
                    @ended="playing = false" />
                <div ref="containerRef" class="workbench-body" :class="{ 'is-resizing': isResizing }"
                    :style="paneStyle">
                    <div class="main-pane" :style="{ order: isSwapped ? 0 : 2 }">
                        <SceneTabs :scene="scene" @change="scene = $event as Scene" />
                        <MedicationScene v-if="scene === 'medication' && medicationPayload"
                            :payload="medicationPayload" :transcript="transcript" :active-segment="activeSegment"
                            :current="current" :checked="checked[0]" :file-name="selectedAudio?.originalName || '录音'"
                            @seek="seek" @toggle-dose="toggleChecked(0)" />
                        <SopScene v-else-if="scene === 'sop' && sopPayload" :payload="sopPayload"
                            :transcript="transcript" :checked="checked" @toggle="toggleChecked($event)"
                            @seek="seek" @tick="tick" />
                        <QuizScene v-else-if="scene === 'quiz' && quizPayload" :payload="quizPayload"
                            :selected="selected" :question-index="questionIndex" :current="current"
                            @select="selected = $event" @seek="seek" @navigate="navigateQuestion" />
                        <MemoScene v-else-if="scene === 'memo' && memoPayload" :payload="memoPayload"
                            :checked="checked" @toggle-todo="toggleTodo" />
                        <InterviewScene v-else-if="scene === 'interview' && interviewPayload"
                            :payload="interviewPayload" :transcript="transcript" @seek="seek" />
                        <TranscriptScene v-else-if="scene === 'transcript' && (transcript.length || transcriptPayload)"
                            :payload="transcriptPayload" :transcript="transcript"
                            :active-segment="activeSegment" @seek="seek" />
                        <div v-else class="scene-empty">
                            <p v-if="sceneLoading">正在加载解析结果…</p>
                            <template v-else>
                                <p>{{ sceneError || '该录音暂无此场景的解析结果' }}</p>
                                <button v-if="selectedAudio && !scenePayload" class="scene-empty-action" @click="reparse">重新解析</button>
                            </template>
                        </div>
                    </div>
                    <div ref="dividerRef" style="order: 1;" class="pane-divider" title="点击切换 7/3 与 3/7，长按拖动调整分栏"
                        @pointerdown="startDividerPress" @pointermove="moveDivider" @pointerup="endDividerPress"
                        @pointercancel="cancelDividerPress" @dblclick="resetSplit"><button type="button"
                            class="pane-divider-btn" :aria-label="mainRatio >= 50 ? '切换为 3/7 分栏' : '切换为 7/3 分栏'"
                            @keydown.enter.prevent="toggleSplit" @keydown.space.prevent="toggleSplit">
                            <ArrowLeft v-if="mainRatio >= 50" :size="14" />
                            <ArrowRight v-else :size="14" />
                        </button></div>
                    <ContextPanel :style="{ order: isSwapped ? 2 : 0 }" :scene="scene"
                        :medication="medicationPayload" :sop="sopPayload" :quiz="quizPayload" :memo="memoPayload"
                        :interview="interviewPayload" :transcript-payload="transcriptPayload"
                        :transcript="transcript" :checked="checked" :selected="selected"
                        :question-index="questionIndex" :transcribing="transcribing"
                        :transcript-error="transcriptError" @transcribe="loadTranscript" @seek="seek"
                        @tick="tick" />
                </div>
                <div class="workbench-footer">
                    <div class="footer-left"><span class="source-dot"></span>{{ footerKind }} <span
                            class="footer-divider"></span><span>{{ selectedAudio ? (selectedAudio.status === 'PARSED' ? '已解析' : '处理中') : '等待选择' }}</span><span
                            class="footer-divider"></span><span>共 <b>{{ footerDuration }}</b></span></div><button
                        class="footer-export" :disabled="!scenePayload" @click="exportScene">
                        <ArrowDownToLine :size="14" /> 导出解析 <span>⌄</span>
                    </button>
                </div>
            </section>
            <footer class="page-footer"><span>© 2026 EchoFlow</span><span>让声音，成为可行动的记忆。</span><a href="#">帮助与反馈
                    <span>↗</span></a></footer>
        </main>
        <UploadModal :open="showUpload" @close="showUpload = false" @uploaded="uploaded = true; refreshAudios(); refreshSchedule()" />
    </div>
</template>
<style>
.app-shell {
    min-height: 100vh;
    padding-bottom: 36px;
}

/* Keep the topbar visually stable while profile actions are open. */
.app-shell::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background: rgba(246, 249, 246, .42);
    backdrop-filter: blur(7px);
    opacity: 0;
    transition: opacity .2s ease;
}

.app-shell.popover-open::before {
    opacity: 1;
}

.app-shell>.topbar {
    position: relative;
    z-index: 20;
}

.app-shell>.workspace {
    position: relative;
    z-index: 1;
    transition: filter .2s ease;
}

.app-shell.popover-open>.workspace {
    filter: blur(1.5px);
}

.workspace {
    width: min(1320px, calc(100% - 84px));
    margin: 0 auto;
}

.welcome-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 43px 0 27px;
}

.eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9px;
    letter-spacing: 1.25px;
    color: #9aa49d;
    font-weight: 700;
}

.eyebrow-line {
    width: 16px;
    height: 1px;
    background: #83b394;
}

.eyebrow-dot {
    color: #c3cac5;
}

.welcome-row h1 {
    font-size: 31px;
    letter-spacing: -1.4px;
    font-weight: 600;
    margin: 12px 0 5px;
    color: #2d3932;
}

.welcome-row h1 em {
    font-style: normal;
    color: #57906c;
}

.welcome-sub {
    font-size: 14px;
    color: #929c95;
    margin: 0;
}

.primary-btn {
    height: 39px;
    border-radius: 8px;
    background: #386f50;
    color: white;
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    box-shadow: 0 3px 9px #356c5026;
}

.primary-btn:hover {
    background: #2c6345;
}

.shortcut {
    font-size: 12px;
    border: 1px solid #ffffff52;
    padding: 4px 3px;
    border-radius: 4px;
    color: #e2efe6;
    margin-left: 5px;
}

.workbench-card {
    margin-top: 0;
    background: #fff;
    border: 1px solid #e9ede9;
    border-radius: 12px;
    overflow: visible;
    position: relative;
    z-index: 1;
    box-shadow: 0 5px 18px #2d47300a;
}

.workbench-body {
    display: grid;
    grid-template-columns: minmax(0, var(--pane-main-fr, 70fr)) 14px minmax(0, var(--pane-side-fr, 30fr));
    min-height: 600px;
    position: relative;
    z-index: 1;
    border-radius: 0 0 12px 12px;
}

.main-pane {
    min-width: 0;
}

.scene-empty {
    min-height: 520px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    color: #929d95;
    font-size: 12px;
    text-align: center;
}

.scene-empty-action {
    border: 1px solid #d7e6d9;
    background: #f3f9f4;
    color: #518a61;
    border-radius: 7px;
    padding: 8px 14px;
    font-size: 12px;
}

.pane-divider {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 16px;
    cursor: pointer;
}

.pane-divider::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: #edf0ed;
}

.pane-divider-btn {
    position: sticky;
    top: 96px;
    z-index: 1;
    width: 35px;
    height: 20px;
    display: grid;
    place-items: center;
    /* border: 1px solid #e4ebe5; */
    border-radius: 3px;
    background: #fff;
    color: #7c8a80;
    box-shadow: 0 2px 7px #2d473012, 0 1px 2px #2d473012;
    transition: color .15s, border-color .15s, background .15s;
}

.pane-divider-btn:hover,
.pane-divider-btn:focus-visible {
    color: #397e5b;
    border-color: #cddfce;
    background: #f7fbf8;
    outline: none;
}

.workbench-body.is-resizing {
    cursor: col-resize;
    user-select: none;
}

.workbench-body.is-resizing .pane-divider-btn {
    color: #397e5b;
    border-color: #a9c9b2;
    background: #edf6ef;
}

.workbench-footer {
    height: 42px;
    border-top: 1px solid #edf0ed;
    background: #fcfdfc;
    padding: 0 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 1;
    border-radius: 0 0 12px 12px;
}

.footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #9ba59e;
    font-size: 10px;
}

.source-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7db78b;
}

.footer-divider {
    height: 11px;
    width: 1px;
    background: #e8ece8;
    margin: 0 3px;
}

.footer-left b {
    font-weight: 500;
    color: #68766d;
}

.footer-export {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #718078;
    font-size: 10px;
}

.footer-export:disabled {
    opacity: .4;
    cursor: not-allowed;
}

.page-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #a7b0a9;
    font-size: 8px;
    padding: 22px 0 8px;
}

.page-footer a {
    color: #89968c;
    text-decoration: none;
}

.page-footer a span {
    color: #68a078;
    margin-left: 4px;
}

@media(min-width:1500px) {
    .workspace {
        width: min(1320px, calc(100% - 120px));
    }
}

@media(max-width:1000px) {
    .workspace {
        width: calc(100% - 44px);
    }

    .workbench-body {
        min-height: 650px;
    }
}

@media(max-width:720px) {
    .workspace {
        width: calc(100% - 28px);
    }

    .welcome-row {
        padding: 30px 0 20px;
        align-items: flex-start;
        gap: 15px;
        flex-direction: column;
    }

    .welcome-row h1 {
        font-size: 26px;
    }

    .welcome-sub {
        font-size: 10px;
    }

    .welcome-row .primary-btn {
        height: 35px;
    }

    .workbench-body {
        display: flex;
        flex-direction: column;
    }

    .pane-divider {
        display: none;
    }

    .main-pane {
        border-right: 0;
        border-bottom: 1px solid #edf0ed;
    }

    .workbench-footer {
        padding: 0 12px;
    }

    .footer-left {
        gap: 5px;
    }

    .footer-left span:nth-last-child(-n+2) {
        display: none;
    }

    .page-footer {
        padding-bottom: 0;
    }
}
</style>
