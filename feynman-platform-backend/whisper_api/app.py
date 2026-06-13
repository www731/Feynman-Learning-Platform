from flask import Flask, request, jsonify
import whisper
import os
import tempfile
import traceback
import shutil

app = Flask(__name__)

# 改为懒加载，避免启动阶段阻塞或失败
model = None
MODEL_NAME = os.environ.get('WHISPER_MODEL', 'base')

@app.get('/healthz')
def healthz():
    return jsonify({"ok": True, "model": MODEL_NAME})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    mimetype = getattr(audio_file, 'mimetype', '') or ''
    ext = '.wav'
    if 'webm' in mimetype:
        ext = '.webm'
    elif 'mp4' in mimetype or 'm4a' in mimetype:
        ext = '.m4a'
    elif 'mpeg' in mimetype or 'mp3' in mimetype:
        ext = '.mp3'
    # 使用 mkstemp 确保 Windows 下句柄可控
    fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    audio_file.save(temp_path)

    # FFmpeg 预检与路径自修复
    ffmpeg_path = shutil.which('ffmpeg')
    if not ffmpeg_path:
        # WinGet 链接目录作为常见安装位置
        local_appdata = os.environ.get('LOCALAPPDATA', '')
        candidates = []
        if local_appdata:
            candidates.append(os.path.join(local_appdata, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'))
        # 常见手动安装路径
        candidates.append(r'C:\ffmpeg\bin\ffmpeg.exe')
        # 常见 Program Files 安装路径
        candidates.append(r'C:\Program Files\ffmpeg\bin\ffmpeg.exe')
        candidates.append(r'C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe')
        # Scoop 安装路径（当前用户）
        candidates.append(os.path.expanduser(r'~\scoop\apps\ffmpeg\current\ffmpeg.exe'))
        for cand in candidates:
            if os.path.exists(cand):
                # 将候选目录加入 PATH 并重试检测
                dir_path = os.path.dirname(cand)
                os.environ['PATH'] = dir_path + os.pathsep + os.environ.get('PATH', '')
                ffmpeg_path = shutil.which('ffmpeg')
                if ffmpeg_path:
                    break
    if not ffmpeg_path:
        print('FFmpeg 未发现：请安装并加入 PATH。')
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({
            "error": "FFmpeg not found in PATH",
            "msg": "Whisper 需要系统安装 ffmpeg。请安装 ffmpeg 并确保命令 'ffmpeg' 可用后重试。"
        }), 500
    else:
        print(f"FFmpeg 路径: {ffmpeg_path}")

    try:
        global model
        if model is None:
            print("首次请求，正在加载Whisper模型...")
            model = whisper.load_model(MODEL_NAME)
            print("模型加载完毕！")
        print(f"开始转录: path={temp_path}, mimetype={mimetype}")
        result = model.transcribe(temp_path)
        os.remove(temp_path)
        print("转录结果:", result['text'])
        return jsonify({"result": result['text']})
    except Exception as e:
        # 打印详细堆栈，便于定位 500 原因
        print("转录异常:", str(e))
        traceback.print_exc()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5001'))
    app.run(host='0.0.0.0', port=port)