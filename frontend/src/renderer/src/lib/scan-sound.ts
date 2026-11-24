/**
 * Soft POS / scanner-style beep for successful desk scans.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctx()
  }
  return audioCtx
}

export async function playScanSuccessSound(): Promise<void> {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === "suspended") {
      await ctx.resume()
    }
  } catch {
    return
  }

  const now = ctx.currentTime
  const duration = 0.12

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  // Sine is softer than square; mid-high pitch still reads as a scanner beep.
  osc.type = "sine"
  osc.frequency.setValueAtTime(1480, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.85, now + 0.01)
  gain.gain.setValueAtTime(0.85, now + 0.07)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}
