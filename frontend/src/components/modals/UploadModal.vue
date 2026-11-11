<script setup lang="ts">
import { AudioLines, Mic, Sparkles, Square, Upload, X } from 'lucide-vue-next'
import { onUnmounted, ref, watch } from 'vue'
import { uploadAudio } from '../../api/audio'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'uploaded', audioId: string): void
  (event: 'error', message: string): void
}>()

const uploading = ref(false)
const progress = ref(0)
const recording = ref(false)
const recordingSeconds = ref(0)
const localError = ref('')

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordedChunks: Blob[] = []
let timer: number | undefined
let cancelRecording = false

function formatRecordingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function clearTimer() {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function releaseStream() {
  mediaStream?.getTracks().forEach(track => track.stop())
  mediaStream = null
}

async function uploadFile(file: File) {
  uploading.value = true
  progress.value = 0
  localError.value = ''
  try {
    const result = await uploadAudio(file, value => {
      progress.value = value
    })
    emit('uploaded', result.audioId)
    emit('close')
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败'
    localError.value = message
    emit('error', message)
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await uploadFile(file)
}

async function onDrop(event: DragEvent) {
  if (uploading.value || recording.value) return
  const file = event.dataTransfer?.files?.[0]
  if (file) await uploadFile(file)
}

async function startRecording() {
  if (uploading.value) return

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    const message = '当前浏览器不支持录音，请改用上传音频文件'
    localError.value = message
    emit('error', message)
    return
  }

  localError.value = ''

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ].find(type => MediaRecorder.isTypeSupported(type))

    mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
    recordedChunks = []
    cancelRecording = false
    mediaRecorder.ondataavailable = event => {
      if (event.data.size) recordedChunks.push(event.data)
    }
    mediaRecorder.onstop = () => {
      void finishRecording()
    }
    mediaRecorder.start()

    recording.value = true
    recordingSeconds.value = 0
    timer = window.setInterval(() => {
      recordingSeconds.value += 1
    }, 1000)
  } catch (error) {
    releaseStream()
    recording.value = false
    const message = error instanceof Error ? error.message : '无法访问麦克风'
    localError.value = message
    emit('error', message)
  }
}

function stopRecording(cancelled = false) {
  cancelRecording = cancelled
  clearTimer()
  recording.value = false
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
}

/** Converts the recorder output to PCM WAV so the local FunASR engine can read it. */
async function transcodeToWav(blob: Blob): Promise<Blob | null> {
  const legacyWindow = window as unknown as { webkitAudioContext?: typeof AudioContext }
  const AudioContextCtor = window.AudioContext ?? legacyWindow.webkitAudioContext
  if (!AudioContextCtor) return null

  const context = new AudioContextCtor()
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    return encodeWav(buffer)
  } catch {
    return null
  } finally {
    void context.close()
  }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels
  const frames = buffer.length
  const blockAlign = channels * 2
  const dataSize = frames * blockAlign
  const view = new DataView(new ArrayBuffer(44 + dataSize))

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, dataSize, true)

  const channelData = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index))
  let offset = 44
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([view.buffer], { type: 'audio/wav' })
}

async function finishRecording() {
  const recorder = mediaRecorder
  const type = recorder?.mimeType || 'audio/webm'
  const blob = new Blob(recordedChunks, { type })

  mediaRecorder = null
  recordedChunks = []
  releaseStream()

  if (cancelRecording || !blob.size) return

  const wav = await transcodeToWav(blob)
  const finalBlob = wav ?? blob
  const extension = wav ? 'wav' : type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const file = new File([finalBlob], `录音_${stamp}.${extension}`, { type: finalBlob.type })

  await uploadFile(file)
}

function toggleRecording() {
  if (recording.value) stopRecording()
  else void startRecording()
}

watch(
  () => props.open,
  open => {
    if (open) localError.value = ''
    else stopRecording(true)
  },
)

onUnmounted(() => {
  stopRecording(true)
  releaseStream()
})
</script>
<template>
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
        <div class="upload-modal"><button class="modal-close" @click="emit('close')">
                <X :size="18" />
            </button>
            <div class="modal-icon">
                <AudioLines :size="22" />
            </div><span class="tiny-label">START WITH A SOUND</span>
            <h2>把声音，交给 EchoFlow</h2>
            <p>上传一段录音，AI 将为你整理成清晰、可行动的内容。</p><label
                :class="['dropzone', { disabled: uploading || recording }]"
                @dragover.prevent @drop.prevent="onDrop"><input type="file" accept="audio/*"
                    :disabled="uploading || recording" @change="selectFile" />
                <Upload :size="22" /><b>{{ uploading ? `上传中… ${progress}%` : recording ? '录音中，暂不可选择文件' : '点击选择音频，或拖放至此' }}</b><span>MP3、M4A、WAV、WebM，单个文件最大 100MB</span>
            </label>
            <div class="modal-or"><i></i> 或者 <i></i></div><button :class="['record-btn', { recording }]"
                :disabled="uploading" @click="toggleRecording">
                <template v-if="recording">
                    <Square :size="13" fill="currentColor" /> 停止录音 {{ formatRecordingTime(recordingSeconds) }}
                </template>
                <template v-else>
                    <Mic :size="16" /> 直接开始录音
                </template>
            </button>
            <p v-if="recording" class="recording-hint"><span class="recording-dot"></span> 正在录音，结束后将自动上传</p>
            <p v-if="localError" class="upload-error">{{ localError }}</p>
            <span class="modal-footnote">
                <Sparkles :size="12" /> 你的录音仅供本人使用，内容安全加密
            </span>
        </div>
    </div>
</template>
<style>
.modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: #24322b55;
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    padding: 20px;
}

.upload-modal {
    position: relative;
    background: white;
    width: min(450px, 100%);
    border-radius: 15px;
    padding: 30px;
    text-align: center;
    box-shadow: 0 20px 70px #1e33242b;
}

.modal-close {
    position: absolute;
    right: 15px;
    top: 15px;
    color: #8b968e;
}

.modal-icon {
    width: 43px;
    height: 43px;
    border-radius: 12px;
    background: #edf6ef;
    color: #58936a;
    display: grid;
    place-items: center;
    margin: 0 auto 14px;
}

.upload-modal h2 {
    font-size: 19px;
    margin: 8px 0;
    color: #334239;
}

.upload-modal>p {
    font-size: 10px;
    color: #929d95;
    margin: 0 0 19px;
}

.dropzone {
    height: 139px;
    border: 1px dashed #c9ddcc;
    border-radius: 9px;
    background: #fbfdfb;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #73a17b;
    cursor: pointer;
}

.dropzone.disabled {
    opacity: .6;
    cursor: not-allowed;
}

.dropzone input {
    display: none;
}

.dropzone b {
    font-size: 10px;
    font-weight: 600;
    color: #617267;
}

.dropzone span {
    font-size: 8px;
    color: #a0aaa3;
}

.modal-or {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #adb6af;
    font-size: 8px;
    margin: 15px 0;
}

.modal-or i {
    height: 1px;
    background: #edf0ed;
    flex: 1;
}

.record-btn {
    height: 36px;
    width: 100%;
    border: 1px solid #e8eee8;
    border-radius: 7px;
    color: #68796d;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 10px;
}

.record-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
}

.record-btn.recording {
    color: #b4574b;
    border-color: #f0d5cf;
    background: #fff7f5;
}

.recording-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 10px 0 0;
    font-size: 9px;
    color: #b0705f;
}

.recording-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d16955;
    animation: recording-pulse 1.2s ease-in-out infinite;
}

.upload-error {
    margin: 10px 0 0;
    color: #b4574b;
    font-size: 9px;
    line-height: 1.5;
}

@keyframes recording-pulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: .35;
    }
}

.modal-footnote {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: #a5afa7;
    font-size: 8px;
    margin-top: 17px;
}

.modal-footnote svg {
    color: #8bb392;
}
</style>
