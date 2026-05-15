/**
 * Bluetooth A2DP Cold-Start 대응 유틸
 *
 * 문제: iOS + 블루투스 환경에서 소리 없는 구간(API fetch 시간 등) 이후
 *       블루투스가 절전 모드(sniff/park)로 진입 → 다음 오디오 재생 시
 *       앞부분 300~500ms 잘림 현상 발생.
 *
 * 해결: 실제 오디오 재생 직전, AudioContext로 무음 버퍼(0.35초)를 먼저
 *       재생하여 블루투스 연결을 active 모드로 깨워둠.
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctx =
      (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new Ctx();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/**
 * 블루투스 warm-up: 약 350ms 무음 재생 후 resolve.
 * 실제 오디오 play() 직전에 await warmupBluetooth() 호출.
 */
export function warmupBluetooth(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) { resolve(); return; }

      const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
      resume.then(() => {
        const WARMUP_SEC = 0.35;
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * WARMUP_SEC), ctx.sampleRate);
        // 극소 진폭(0.001)으로 채워서 완전 무음이 아닌 "거의 무음" → BT 절전 방지
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = 0.001 * Math.sin(i * 0.01);

        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = 0.001; // 사람이 듣기엔 무음
        src.connect(gain);
        gain.connect(ctx.destination);
        src.onended = () => resolve();
        src.start(0);
      }).catch(() => resolve());
    } catch {
      resolve();
    }
  });
}
