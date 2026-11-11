import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
// 根据你的实际目录结构调整引入路径
import { AsrService } from './src/services/asr.service';

dotenv.config();

async function runTest() {
  // 1. 指定本地测试音频路径（请确保该路径下有测试音频，如 test.wav 或 test.mp3）
  const sampleAudioPath = path.resolve(import.meta.dirname, './storage/uploads/aud_85e66e120aff42ee9f1730e190e53feb.mp3');

  console.log('=== 开始测试本地 FunASR 语音转写服务 ===');
  console.log(`目标服务地址: ${process.env.FUNASR_BASE_URL || 'http://127.0.0.1:8001'}`);
  console.log(`测试音频路径: ${sampleAudioPath}`);

  if (!fs.existsSync(sampleAudioPath)) {
    console.error(`❌ 找不到测试音频文件，请先放置一个音频文件到: ${sampleAudioPath}`);
    process.exit(1);
  }

  try {
    const startTime = Date.now();
    console.log('⏳ 正在发送音频并等待 FunASR 识别...');

    const result = await AsrService.transcribeLocalAudio(sampleAudioPath);
    const cost = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ 转写成功！耗时: ${cost}s`);
    console.log('\n--- 完整文本 ---');
    console.log(result.fullText);

    console.log('\n--- 时间戳切片 (前 5 条) ---');
    console.table((result.segments || []).slice(0, 5));
  } catch (error) {
    console.error('\n❌ ASR 测试失败:', error);
  }
}

runTest();