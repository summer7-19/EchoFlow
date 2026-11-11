import axios from 'axios'
import path from 'node:path'
import { config } from '../config/env.js'

export interface TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
  speaker?: number
}

export interface AsrTranscribeResult {
  fullText: string
  segments: TranscriptSegment[]
  processTime: number
}

const { baseUrl, timeoutMs } = config.asr

export class AsrService {
  static async transcribeLocalAudio(
    relativeFilePath: string,
    language = 'auto',
  ): Promise<AsrTranscribeResult> {
    const filePath = path.resolve(process.cwd(), relativeFilePath)
    console.log(`Transcribing ${filePath}...`)
    try {
      const { data } = await axios.post(
        `${baseUrl}/api/transcribe`,
        { file_path: filePath, language },
        { timeout: timeoutMs },
      )

      return {
        fullText: data.full_text,
        segments: data.segments,
        processTime: data.process_time,
      }
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? error.response?.data?.detail ?? error.message
        : '未知错误'
      throw new Error(`[Local FunASR 调用失败]: ${detail}`)
    }
  }
}
