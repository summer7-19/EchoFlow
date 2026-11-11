import type { AudioRecord } from '../types/audio'
import type { ScenePayload } from '../api/scenes'
import type {
  InterviewPayload,
  MedicationPayload,
  MemoPayload,
  QuizPayload,
  SopPayload,
  TranscriptPayload,
} from '../types/scenes'

type TranscriptLine = { start: number; end?: number; text: string }

const CATEGORY_LABELS: Record<ScenePayload['category'], string> = {
  MEDICATION: '健康日程',
  SOP: '流程规程',
  QUIZ: '语言精听',
  MEMO: '知识纪要',
  INTERVIEW: '面试复盘',
  TRANSCRIPT: '原文转写',
}

const PRINT_STYLES = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #28332c;
    font: 12pt/1.7 "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif;
  }
  header { border-bottom: 2px solid #7fb393; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 20pt; margin: 0 0 6px; color: #2f4a39; }
  h2 { font-size: 14pt; margin: 22px 0 8px; color: #3d6a4e; border-left: 3px solid #7fb393; padding-left: 8px; }
  h3 { font-size: 12pt; margin: 14px 0 6px; color: #44584a; }
  .meta, .muted { color: #7c8a80; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #dfe7e1; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #f3f8f4; width: 22%; font-weight: 600; }
  td.time { width: 64px; white-space: nowrap; color: #5f8f6d; font-variant-numeric: tabular-nums; }
  ul, ol { margin: 6px 0; padding-left: 20px; }
  li { margin: 4px 0; page-break-inside: avoid; }
  .answer { color: #2f7a4b; font-weight: 600; }
  section { page-break-inside: auto; }
  .summary { background: #f6faf7; border-radius: 6px; padding: 10px 12px; }
`

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => {
    switch (character) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default: return '&#39;'
    }
  })
}

function formatClock(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safe / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function renderTranscript(transcript: TranscriptLine[]) {
  if (!transcript.length) return '<p class="muted">暂无转写内容。</p>'
  const rows = transcript
    .map(line => `<tr><td class="time">${formatClock(line.start)}</td><td>${escapeHtml(line.text)}</td></tr>`)
    .join('')
  return `<table><thead><tr><th>时间</th><th>内容</th></tr></thead><tbody>${rows}</tbody></table>`
}

function renderMedication(payload: MedicationPayload) {
  const schedule = payload.schedule.length
    ? `<ul>${payload.schedule
      .map(item => `<li><strong>${escapeHtml(item.time)}</strong> ${escapeHtml(item.title)}</li>`)
      .join('')}</ul>`
    : '<p class="muted">未提及服药时间。</p>'

  const warnings = payload.warnings?.length
    ? `<ul>${payload.warnings.map(item => `<li>${escapeHtml(item.text)}</li>`).join('')}</ul>`
    : '<p class="muted">未提及安全提醒。</p>'

  return `<section>
    <h2>用药信息</h2>
    <table>
      <tr><th>药品名称</th><td>${escapeHtml(payload.medication.name)}</td></tr>
      <tr><th>单次剂量</th><td>${escapeHtml(payload.medication.dose)}</td></tr>
      <tr><th>服用方式</th><td>${escapeHtml(payload.medication.method)}</td></tr>
    </table>
    <h3>服药安排</h3>${schedule}
    <h3>安全提醒</h3>${warnings}
  </section>`
}

function renderSop(payload: SopPayload) {
  const steps = [...payload.steps].sort((left, right) => left.order - right.order)
  const items = steps.length
    ? steps
      .map(step => {
        const duration = step.duration
          ? `（约 ${Math.max(1, Math.round(step.duration / 60))} 分钟）`
          : ''
        const warnings = step.warnings?.length
          ? `<div class="muted">注意：${step.warnings.map(escapeHtml).join('；')}</div>`
          : ''
        return `<li><strong>${escapeHtml(step.title)}</strong>${duration}${warnings}</li>`
      })
      .join('')
    : '<li class="muted">未提取到步骤。</li>'

  return `<section><h2>流程规程</h2><h3>${escapeHtml(payload.title)}</h3><ol>${items}</ol></section>`
}

function renderQuiz(payload: QuizPayload) {
  const questions = payload.questions.length
    ? payload.questions
      .map((question, index) => {
        const options = question.options
          .map((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex)
            const correct = optionIndex === question.answer ? ' class="answer"' : ''
            const mark = optionIndex === question.answer ? ' ✓' : ''
            return `<li${correct}>${letter}. ${escapeHtml(option)}${mark}</li>`
          })
          .join('')
        return `<li><p>${index + 1}. ${escapeHtml(question.question)}</p><ul>${options}</ul></li>`
      })
      .join('')
    : '<li class="muted">未提取到题目。</li>'

  const bilingual = payload.transcript.length
    ? `<table><tbody>${payload.transcript
      .map(line => `<tr><td class="time">${formatClock(line.start)}</td><td>${escapeHtml(line.text)}<br /><span class="muted">${escapeHtml(line.translation ?? '')}</span></td></tr>`)
      .join('')}</tbody></table>`
    : '<p class="muted">暂无中英对照内容。</p>'

  return `<section><h2>语言精听</h2><h3>${escapeHtml(payload.title)}</h3>
    <ol>${questions}</ol><h3>中英对照</h3>${bilingual}</section>`
}

function renderMindmap(children: NonNullable<MemoPayload['mindmap']>['children'], depth = 0): string {
  if (!children?.length || depth > 2) return ''
  const nodes: string = children
    .filter(child => child && typeof child.name === 'string')
    .map(child => `<li>${escapeHtml(child.name)}${renderMindmap(child.children, depth + 1)}</li>`)
    .join('')
  return nodes ? `<ul>${nodes}</ul>` : ''
}

function renderMemo(payload: MemoPayload) {
  const bullets = payload.bullets.length
    ? `<ul>${payload.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="muted">未提取到讨论要点。</p>'

  const actions = payload.actions.length
    ? `<ul>${payload.actions
      .map(item => `<li>${escapeHtml(item.title)}${item.dueAt ? ` <span class="muted">（截止 ${escapeHtml(item.dueAt)}）</span>` : ''}</li>`)
      .join('')}</ul>`
    : '<p class="muted">未提取到行动事项。</p>'

  const mindmap = payload.mindmap
    ? `<h3>主题脉络</h3><p><strong>${escapeHtml(payload.mindmap.name)}</strong></p>${renderMindmap(payload.mindmap.children)}`
    : ''

  return `<section><h2>知识纪要</h2><h3>${escapeHtml(payload.title)}</h3>
    <p class="summary">${escapeHtml(payload.summary)}</p>
    <h3>讨论要点</h3>${bullets}
    <h3>行动事项</h3>${actions}${mindmap}</section>`
}

function renderInterview(payload: InterviewPayload) {
  const rounds = payload.rounds.length
    ? payload.rounds
      .map((round, index) => `<li><p><strong>Q${index + 1}. ${escapeHtml(round.question)}</strong></p>
        <p>${escapeHtml(round.answer)}</p>
        ${round.evaluation ? `<div class="muted">评价：${escapeHtml(round.evaluation)}</div>` : ''}</li>`)
      .join('')
    : '<li class="muted">未提取到面试问答。</li>'

  const highlights = payload.highlights?.length
    ? `<ul>${payload.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="muted">未提取到复盘要点。</p>'

  return `<section><h2>面试复盘</h2><h3>${escapeHtml(payload.title)}</h3>
    ${payload.role ? `<p class="meta">岗位：${escapeHtml(payload.role)}</p>` : ''}
    <p class="summary">${escapeHtml(payload.summary)}</p>
    <h3>问答回顾</h3><ol>${rounds}</ol>
    <h3>关键要点</h3>${highlights}</section>`
}

function renderTranscriptScene(payload: TranscriptPayload) {
  const paragraphs = payload.paragraphs?.length
    ? `<table><tbody>${payload.paragraphs
      .map(line => `<tr><td class="time">${formatClock(line.start)}</td><td>${escapeHtml(line.text)}</td></tr>`)
      .join('')}</tbody></table>`
    : '<p class="muted">暂无转写内容。</p>'

  return `<section><h2>原文转写</h2><h3>${escapeHtml(payload.title)}</h3>
    ${payload.language ? `<p class="meta">语言：${escapeHtml(payload.language)}</p>` : ''}
    ${paragraphs}</section>`
}

function renderScene(scene: ScenePayload) {
  switch (scene.category) {
    case 'MEDICATION':
      return renderMedication(scene.payload)
    case 'SOP':
      return renderSop(scene.payload)
    case 'QUIZ':
      return renderQuiz(scene.payload)
    case 'MEMO':
      return renderMemo(scene.payload)
    case 'INTERVIEW':
      return renderInterview(scene.payload)
    case 'TRANSCRIPT':
      return renderTranscriptScene(scene.payload)
  }
}

function printDocument(title: string, bodyHtml: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow
    if (!frameWindow) {
      iframe.remove()
      return
    }
    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(() => iframe.remove(), 1000)
  }

  iframe.srcdoc = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" />
    <title>${escapeHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`
  document.body.appendChild(iframe)
}

export function printScenePdf(
  audio: AudioRecord,
  scene: ScenePayload,
  transcript: TranscriptLine[],
) {
  const createdAt = new Date(audio.createdAt).toLocaleString()
  const body = `<header>
      <h1>${escapeHtml(audio.originalName)}</h1>
      <p class="meta">${CATEGORY_LABELS[scene.category]} · ${escapeHtml(createdAt)} · 共 ${transcript.length} 段转写</p>
    </header>
    ${renderScene(scene)}
    <section><h2>转写原文</h2>${renderTranscript(transcript)}</section>`
  printDocument(`${audio.originalName} - 解析结果`, body)
}

export function printTranscriptPdf(fileName: string, transcript: TranscriptLine[]) {
  const body = `<header>
      <h1>${escapeHtml(fileName)}</h1>
      <p class="meta">转写文本 · 共 ${transcript.length} 段</p>
    </header>
    ${renderTranscript(transcript)}`
  printDocument(`${fileName} - 转写文本`, body)
}
