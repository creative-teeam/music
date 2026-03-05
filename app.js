let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let melodyBuffer = null;
let harmonyBuffer = null;

// ---------------------------
// 音声読み込み
// ---------------------------
document.getElementById("melodyFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const arrayBuffer = await file.arrayBuffer();
  melodyBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  alert("メロディを読み込みました");
});

// ---------------------------
// 再生関数
// ---------------------------
function playBuffer(buffer) {
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}

// メロディ再生
document.getElementById("playMelody").onclick = () => {
  if (melodyBuffer) playBuffer(melodyBuffer);
};

// ---------------------------
// ピッチ検出(YINアルゴリズムの簡易版)
// ---------------------------
function detectPitch(data, sampleRate) {
  let bestOffset = -1;
  let bestCorrelation = 0;

  for (let offset = 20; offset < 1000; offset++) {
    let corr = 0;
    for (let i = 0; i < data.length - offset; i++) {
      corr += data[i] * data[i + offset];
    }
    if (corr > bestCorrelation) {
      bestCorrelation = corr;
      bestOffset = offset;
    }
  }
  if (bestOffset === -1) return null;

  const freq = sampleRate / bestOffset;
  return freq;
}

// ---------------------------
// ハモリ生成（3度上 = 周波数1.26倍）
// ---------------------------
document.getElementById("generateHarmony").onclick = () => {
  if (!melodyBuffer) return alert("メロディを読み込んでください");

  const sampleRate = melodyBuffer.sampleRate;
  const input = melodyBuffer.getChannelData(0);

  const frameSize = 2048;
  const hop = 1024;

  const output = new Float32Array(input.length);

  for (let i = 0; i < input.length - frameSize; i += hop) {
    const frame = input.slice(i, i + frameSize);
    const pitch = detectPitch(frame, sampleRate);

    if (pitch) {
      const harmonyPitch = pitch * 1.26;
      const ratio = harmonyPitch / pitch;

      for (let j = 0; j < hop; j++) {
        output[i + j] = input[i + j] * ratio;
      }
    }
  }

  harmonyBuffer = audioCtx.createBuffer(1, output.length, sampleRate);
  harmonyBuffer.copyToChannel(output, 0);

  alert("ハモリ生成が完了しました！");
};

// ハモリ再生
document.getElementById("playHarmony").onclick = () => {
  if (harmonyBuffer) playBuffer(harmonyBuffer);
};

// ---------------------------
// 録音 → ピッチ可視化
// ---------------------------
let mediaStream = null;
let analyser = null;
let recording = false;

document.getElementById("startRec").onclick = async () => {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const src = audioCtx.createMediaStreamSource(mediaStream);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);

  recording = true;
  drawPitch();
};

document.getElementById("stopRec").onclick = () => {
  recording = false;
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
};

function drawPitch() {
  if (!recording) return;
  requestAnimationFrame(drawPitch);

  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);

  const pitch = detectPitch(data, audioCtx.sampleRate);

  const canvas = document.getElementById("pitchCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (pitch) {
    ctx.fillText("Pitch: " + Math.round(pitch) + " Hz", 20, 50);
    const y = canvas.height - (pitch / 1000) * canvas.height;
    ctx.fillRect(0, y, canvas.width, 4);
  }
}
