import type { CountdownPhase } from './CountdownOverlay'

export type CompositeSnapshot = {
  sessionState: 'COUNTDOWN' | 'ACTIVE_SESSION'
  countdownPhase: CountdownPhase
  reps: number
  remainingSec: number
  motion01: number
  variant: 'solo' | 'default'
  personalBest: number | null
  voiceHudVisible: boolean
  voiceMuted: boolean
}

const ACCENT = '#ff5722'

function formatTimeLeft(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function drawVideoObjectFit(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  cw: number,
  ch: number,
  fit: 'cover' | 'contain',
): void {
  const vw = video.videoWidth
  const vh = video.videoHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, cw, ch)
  if (!vw || !vh) return

  let dx = 0
  let dy = 0
  let dw = cw
  let dh = ch

  if (fit === 'cover') {
    const scale = Math.max(cw / vw, ch / vh)
    dw = vw * scale
    dh = vh * scale
    dx = (cw - dw) / 2
    dy = (ch - dh) / 2
  } else {
    const scale = Math.min(cw / vw, ch / vh)
    dw = vw * scale
    dh = vh * scale
    dx = (cw - dw) / 2
    dy = (ch - dh) / 2
  }

  ctx.drawImage(video, 0, 0, vw, vh, dx, dy, dw, dh)
}

function drawMotionBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  w: number,
  h: number,
  value01: number,
) {
  const v = Math.max(0, Math.min(1, value01))
  const x = cx - w / 2
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()

  const fillGrad = ctx.createLinearGradient(x, y, x + w, y)
  fillGrad.addColorStop(0, ACCENT)
  fillGrad.addColorStop(1, 'rgba(255,140,95,1)')
  ctx.fillStyle = fillGrad
  ctx.beginPath()
  ctx.roundRect(x, y, w * v, h, h / 2)
  ctx.fill()
}

function drawCountdownDefault(ctx: CanvasRenderingContext2D, cw: number, ch: number, phase: CountdownPhase) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, cw, ch)

  const display = phase === 'go' ? 'Go!' : String(phase)
  const fontSize = Math.min(ch * 0.22, cw * 0.28)
  ctx.font = `800 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = ACCENT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(255,87,34,0.45)'
  ctx.shadowBlur = Math.min(cw, ch) * 0.06
  ctx.fillText(display, cw / 2, ch / 2 - fontSize * 0.08)
  ctx.shadowBlur = 0

  const labelSize = Math.max(11, Math.round(Math.min(cw, ch) * 0.035))
  ctx.font = `700 ${labelSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(240,242,246,0.55)'
  ctx.fillText('Get ready', cw / 2, ch / 2 + fontSize * 0.55)
}

function drawCountdownSolo(ctx: CanvasRenderingContext2D, cw: number, ch: number, phase: CountdownPhase) {
  const display = phase === 'go' ? 'Go!' : String(phase)
  const fontSize = Math.min(ch * 0.34, cw * 0.42)
  ctx.font = `500 ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(display, cw / 2, ch / 2 - fontSize * 0.06)

  const labelSize = Math.max(11, Math.round(Math.min(cw, ch) * 0.032))
  ctx.font = `${labelSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  const spacingPx = Math.round(labelSize * 0.15)
  ctx.letterSpacing = `${spacingPx}px`
  ctx.fillText('GET READY', cw / 2, ch / 2 + fontSize * 0.52)
  ctx.letterSpacing = '0'
}

function wrapHint(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  yTop: number,
  maxW: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/)
  let line = ''
  let y = yTop
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      line = words[i]
      y -= lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y)
}

function drawVoiceChip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, muted: boolean) {
  ctx.fillStyle = muted ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'
  ctx.strokeStyle = muted ? 'transparent' : 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 8)
  ctx.fill()
  if (!muted) ctx.stroke()
  ctx.globalAlpha = muted ? 0.45 : 0.92
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  const ix = x + size * 0.28
  const iy = y + size * 0.38
  ctx.beginPath()
  ctx.moveTo(ix, iy + size * 0.08)
  ctx.lineTo(ix + size * 0.22, iy + size * 0.08)
  ctx.lineTo(ix + size * 0.38, iy + size * 0.02)
  ctx.lineTo(ix + size * 0.38, iy + size * 0.62)
  ctx.lineTo(ix + size * 0.22, iy + size * 0.52)
  ctx.lineTo(ix, iy + size * 0.52)
  ctx.closePath()
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawActiveDefault(ctx: CanvasRenderingContext2D, cw: number, ch: number, snap: CompositeSnapshot) {
  const pad = Math.round(Math.min(cw, ch) * 0.03)
  const grad = ctx.createLinearGradient(0, ch - pad * 12, 0, ch)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.72)')
  ctx.fillStyle = grad
  ctx.fillRect(0, Math.max(0, ch - pad * 14), cw, pad * 14)

  const statLabel = Math.max(10, Math.round(Math.min(cw, ch) * 0.028))
  const statValue = Math.max(18, Math.round(Math.min(cw, ch) * 0.048))
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'

  const baseY = ch - pad * 2
  ctx.font = `700 ${statLabel}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(230,232,238,0.65)'
  ctx.fillText('TIME', pad, baseY - statValue - pad * 0.25)
  ctx.fillText('REPS', pad + cw * 0.28, baseY - statValue - pad * 0.25)

  ctx.font = `800 ${statValue}px system-ui, sans-serif`
  ctx.fillStyle = '#f0f2ee'
  ctx.fillText(`${snap.remainingSec}s`, pad, baseY)
  ctx.fillText(String(snap.reps), pad + cw * 0.28, baseY)

  const barY = baseY - statValue - pad * 4
  const barW = cw - pad * 2
  const barH = Math.max(8, Math.round(Math.min(cw, ch) * 0.018))
  drawMotionBar(ctx, cw / 2, barY, barW, barH, snap.motion01)

  const hintSize = Math.max(10, Math.round(Math.min(cw, ch) * 0.026))
  ctx.font = `${hintSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(230,232,238,0.65)'
  ctx.textAlign = 'left'
  const hint =
    'Keep your full body in frame — edges and cropping can cost reps. Controlled tempo and full range help.'
  const maxHintW = cw - pad * 2 - cw * 0.22
  wrapHint(ctx, hint, pad, barY - pad * 1.25, maxHintW, hintSize * 1.35)

  const btnW = Math.min(cw * 0.42, 160)
  const btnH = Math.max(30, Math.round(Math.min(cw, ch) * 0.065))
  const btnX = cw - pad - btnW
  const btnY = baseY - btnH + pad * 0.35
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(btnX, btnY, btnW, btnH, 8)
  ctx.fill()
  ctx.stroke()
  ctx.font = `600 ${Math.max(12, Math.round(btnH * 0.38))}px system-ui, sans-serif`
  ctx.fillStyle = '#f0f2ee'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('End session', btnX + btnW / 2, btnY + btnH / 2)

  if (snap.voiceHudVisible) {
    drawVoiceChip(ctx, btnX - pad * 0.5 - btnH, btnY, btnH, snap.voiceMuted)
  }
}

function drawActiveSolo(ctx: CanvasRenderingContext2D, cw: number, ch: number, snap: CompositeSnapshot) {
  const padTop = Math.round(Math.min(cw, ch) * 0.035 + 8)
  const padX = Math.round(Math.min(cw, ch) * 0.045)

  const urgent = snap.remainingSec < 15
  const timerCardW = Math.max(88, cw * 0.26)
  const timerCardH = Math.round(timerCardW * 0.52)
  ctx.fillStyle = 'rgba(13,13,15,0.8)'
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(padX, padTop, timerCardW, timerCardH, 10)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = `700 ${Math.max(9, timerCardH * 0.14)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText('TIME LEFT', padX + timerCardW * 0.08, padTop + timerCardH * 0.14)

  ctx.font = `600 ${timerCardH * 0.38}px system-ui, sans-serif`
  ctx.fillStyle = urgent ? ACCENT : '#ffffff'
  ctx.fillText(formatTimeLeft(snap.remainingSec), padX + timerCardW * 0.08, padTop + timerCardH * 0.36)

  const btnH = Math.max(34, Math.round(timerCardH * 1.05))
  const stopW = Math.max(52, cw * 0.14)
  const stopX = cw - padX - stopW
  ctx.fillStyle = 'rgba(255,255,255,0.09)'
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath()
  ctx.roundRect(stopX, padTop, stopW, btnH, 8)
  ctx.fill()
  ctx.stroke()
  ctx.font = `600 ${Math.max(12, btnH * 0.34)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Stop', stopX + stopW / 2, padTop + btnH / 2)

  if (snap.voiceHudVisible) {
    const vs = btnH
    const voiceLeft = stopX - padX * 0.5 - vs
    drawVoiceChip(ctx, voiceLeft, padTop, vs, snap.voiceMuted)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const repsFont = Math.min(ch * 0.26, cw * 0.55)
  ctx.font = `500 ${repsFont}px system-ui, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(String(snap.reps), cw / 2, ch * 0.48)

  const repsLabelSize = Math.max(11, Math.round(repsFont * 0.14))
  ctx.font = `${repsLabelSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText('reps', cw / 2, ch * 0.48 + repsFont * 0.42)

  const pbSize = Math.max(11, Math.round(Math.min(cw, ch) * 0.032))
  ctx.font = `${pbSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  const pbNum = snap.personalBest != null ? String(snap.personalBest) : '—'
  ctx.fillText(`Personal best: ${pbNum}`, cw / 2, ch * 0.48 + repsFont * 0.72)

  const motionLabelSize = Math.max(10, Math.round(Math.min(cw, ch) * 0.028))
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.font = `700 ${motionLabelSize}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  ctx.fillText('MOTION', padX, ch - padTop - Math.min(ch * 0.045, 28))

  const barW = Math.min(240, cw * 0.7)
  const barH = 3
  const barBottom = ch - padTop - Math.min(ch * 0.018, 12)
  drawMotionBar(ctx, cw / 2, barBottom - barH, barW, barH, snap.motion01)
}

/** Composite camera frame + HUD into the recording canvas (approximates on-screen preview). */
export function composePushupRecordingFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  snap: CompositeSnapshot,
): void {
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const fit = snap.variant === 'solo' ? 'cover' : 'contain'
  drawVideoObjectFit(ctx, video, cw, ch, fit)

  if (snap.sessionState === 'COUNTDOWN') {
    if (snap.variant === 'solo') {
      drawCountdownSolo(ctx, cw, ch, snap.countdownPhase)
    } else {
      drawCountdownDefault(ctx, cw, ch, snap.countdownPhase)
    }
    return
  }

  if (snap.variant === 'solo') {
    drawActiveSolo(ctx, cw, ch, snap)
  } else {
    drawActiveDefault(ctx, cw, ch, snap)
  }
}
