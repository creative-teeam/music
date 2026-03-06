let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let melodyBuffer = null;
let harmonyBuffer = null;

// ログ保存用
let log1 = [];
let log2 = [];

function addLog1(text) {
  log1.push(text);
}
function addLog2(text) {
  log2.push(text);
}

// ------------------------------------
// 音声読み込み
// ------------------------------------
document.getElementById("melodyFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const arrayBuffer = await file.arrayBuffer();
  melodyBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  addLog1("メロディ読み込み: " + file.name);

  alert("メロディを読み込みました");
});

// -----------------------------------
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

// ------------------------------------
// ピッチ検出 (簡易)
// ------------------------------------
function detectPitch(data, sampleRate) {
  let bestOffset = -1;
  let bestCorr = 0;
  for (let offset = 20; offset < 1000; offset++) {
    let corr = 0;
    for (let i = 0; i < data.length - offset; i++) {
      corr += data[i] * data[i + offset];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestOffset = offset;
    }
  }
  if (bestOffset === -1) return null;
  return sampleRate / bestOffset;
}

// ------------------------------------
// ハモリ生成（特徴に応じて変化）
// ------------------------------------
document.getElementById("generateHarmony").onclick = () => {
  if (!melodyBuffer) return alert("メロディを読み込んでください");

  const style = document.getElementById("harmonyStyle").value.trim();
  if (!style) return alert("ハモリ特徴を入力してください");

  addLog1("ハモリ生成開始（特徴: " + style + "）");

  let ratio = 1.26; // デフォルト=3度上

  if (style.includes("美") || style.includes("優")) {
    ratio = 1.20;
  }
  if (style.includes("盛") || style.includes("力") || style.includes("上")) {
    ratio = 1.32;
  }
  if (style.includes("しっとり") || style.includes("落")) {
    ratio = 1.15;
  }

  const sampleRate = melodyBuffer.sampleRate;
  const input = melodyBuffer.getChannelData(0);

  const frame = 2048;
  const hop = 1024;

  const out = new Float32Array(input.length);

  for (let i = 0; i < input.length - frame; i += hop) {
    for (let j = 0; j < hop; j++) {
      out[i + j] = input[i + j] * ratio;
    }
  }

  harmonyBuffer = audioCtx.createBuffer(1, out.length, sampleRate);
  harmonyBuffer.copyToChannel(out, 0);

  addLog1("ハモリ生成完了（比率: " + ratio + "）");

  alert("ハモリ生成が完了しました");
};

// 再生
document.getElementById("playHarmony").onclick = () => {
  if (harmonyBuffer) playBuffer(harmonyBuffer);
};

// ------------------------------------
// 録音 → ピッチ可視化
// ------------------------------------
let mediaStream = null;
let analyser = null;
let recording = false;

document.getElementById("startRec").onclick = async () => {
  addLog2("録音開始");

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
  addLog2("録音停止");

  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
};

function drawPitch() {
  if (!recording) return;
  requestAnimationFrame(drawPitch);

  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);

  const pitch = detectPitch(data, audioCtx.sampleRate);

  const c = document.getElementById("pitchCanvas");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  if (pitch) {
    ctx.fillText("Pitch: " + Math.round(pitch) + " Hz", 20, 50);
    const y = c.height - (pitch / 1000) * c.height;
    ctx.fillRect(0, y, c.width, 4);
  }
}

// ------------------------------------
// ログ表示
// ------------------------------------
document.getElementById("showLogs").onclick = () => {
  let combined = "【ログ1: メロディ & ハモリ】\n" +
                 log1.join("\n") +
                 "\n\n【ログ2: 録音】\n" +
                 log2.join("\n");

  document.getElementById("logArea").textContent = combined;
};
