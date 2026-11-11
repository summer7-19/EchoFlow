import os
import time
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from funasr import AutoModel

app = FastAPI(title="EchoFlow Local FunASR Engine", version="1.0.0")

# 全局模型实例缓存
asr_model = None

@app.on_event("startup")
def load_models():
    """
    服务启动时预加载模型到内存，避免每次请求重复加载
    paraformer-zh 支持中文及中英混杂，且原生支持高精度句级时间戳
    """
    global asr_model
    print("⏳ [FunASR] 正在加载本地语音识别模型 (首次运行会自动下载模型权重)...")
    start_t = time.time()
    
    # 如本机有 NVIDIA GPU 可将 device 改为 "cuda:0"，纯 CPU 或 Mac 保持 "cpu" 即可
    device = os.getenv("ASR_DEVICE", "cpu")
    
    asr_model = AutoModel(
        model="paraformer-zh",
        vad_model="fsmn-vad",
        punc_model="ct-punc",
        # spk_model="cam++",  # 如需区分说话人可取消注释
        device=device,
        disable_update=True
    )
    print(f"✅ [FunASR] 模型加载完成！耗时: {round(time.time() - start_t, 2)}s | 运行设备: {device}")


class TranscribeRequest(BaseModel):
    file_path: str               # 宿主机音频文件的绝对路径
    language: Optional[str] = "auto"  # 预留语言参数: zh / en / auto


@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": asr_model is not None}


@app.post("/api/transcribe")
def transcribe_audio(req: TranscribeRequest):
    if asr_model is None:
        raise HTTPException(status_code=503, detail="ASR 模型尚未加载完毕")

    # 校验本地磁盘文件是否存在
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail=f"找不到音频文件: {req.file_path}")

    try:
        start_time = time.time()
        
        # 调用 FunASR 推理，开启 sentence_timestamp 自动结合标点聚合句级时间戳
        res = asr_model.generate(
            input=req.file_path,
            batch_size_s=300,
            sentence_timestamp=True
        )

        if not res or len(res) == 0:
            return {
                "success": True,
                "full_text": "",
                "segments": [],
                "process_time": 0
            }

        raw_item = res[0]
        full_text = raw_item.get("text", "")
        sentence_info = raw_item.get("sentence_info", [])

        segments = []
        for idx, sent in enumerate(sentence_info):
            # FunASR 默认返回毫秒 (ms)，转换为保留两位小数的秒 (s) 供 Wavesurfer 使用
            start_sec = round(sent.get("start", 0) / 1000.0, 2)
            end_sec = round(sent.get("end", 0) / 1000.0, 2)
            text_str = sent.get("text", "").strip()

            if text_str:
                segments.append({
                    "id": idx + 1,
                    "start": start_sec,
                    "end": end_sec,
                    "text": text_str,
                    "speaker": sent.get("spk", 0)
                })

        # 兜底：若音频极短未触发分句，则将整段作为单个切片返回
        if len(segments) == 0 and full_text:
            segments.append({
                "id": 1,
                "start": 0.0,
                "end": 0.0,
                "text": full_text,
                "speaker": 0
            })

        return {
            "success": True,
            "full_text": full_text,
            "segments": segments,
            "process_time": round(time.time() - start_time, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ASR 推理异常: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=False)