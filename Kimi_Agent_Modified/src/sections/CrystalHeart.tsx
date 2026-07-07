import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react'
import gsap from 'gsap'

// ============================================================
// TYPES
// ============================================================
export interface CrystalHeartHandle {
  triggerBeam: (fromX: number, fromY: number) => void
  startCinematicSequence: () => void
}

interface Props {
  onComplete: () => void
}

interface Beam {
  startX: number
  startY: number
  endX: number
  endY: number
  progress: number
  speed: number
  travelingParticles: Array<{
    t: number
    speed: number
    size: number
    offset: number
  }>
  triggered: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  size: number
  color: string
  opacity: number
  life: number
  maxLife: number
  decay: number
  type: 'shard' | 'spark' | 'miniHeart' | 'star' | 'dust' | 'ray'
  gravity: number
  drag: number
}

interface Bubble {
  x: number
  y: number
  size: number
  speed: number
  wobble: number
  wobbleSpeed: number
  wobbleAmp: number
  opacity: number
}

interface Crack {
  points: Array<{ x: number; y: number }>
}

interface SplashParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  decay: number
}

// ============================================================
// CONSTANTS
// ============================================================
const SHARD_COLORS = ['#DC143C', '#8B0000', '#FF1744', '#E91E63', '#F8BBD0', '#C2185B', '#AD1457']
const SPARK_COLORS = ['#fbbf24', '#fde047', '#ffffff', '#ffeb3b', '#ffc107', '#f472b6', '#ff8a65']
const DUST_COLORS = ['#fbbf24', '#f59e0b', '#fde047', '#ffffff', '#fff8e1', '#ffe082']

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getBezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) {
  const o = 1 - t
  return { x: o * o * p0.x + 2 * o * t * p1.x + t * t * p2.x, y: o * o * p0.y + 2 * o * t * p1.y + t * t * p2.y }
}

function getCurveControl(fromX: number, fromY: number, toX: number, toY: number) {
  const mx = (fromX + toX) / 2
  const my = (fromY + toY) / 2
  const dx = toX - fromX
  const dy = toY - fromY
  const d = Math.sqrt(dx * dx + dy * dy) || 1
  const off = -d * 0.28 - 50
  return { x: mx + (-dy / d) * off, y: my + (dx / d) * off }
}

function heartPathOnCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const k = s / 200
  ctx.beginPath()
  ctx.moveTo(cx + 0 * k, cy + 80 * k)
  ctx.bezierCurveTo(cx + -80 * k, cy + 20 * k, cx + -100 * k, cy + -40 * k, cx + -70 * k, cy + -70 * k)
  ctx.bezierCurveTo(cx + -40 * k, cy + -100 * k, cx + 0 * k, cy + -80 * k, cx + 0 * k, cy + -50 * k)
  ctx.bezierCurveTo(cx + 0 * k, cy + -80 * k, cx + 40 * k, cy + -100 * k, cx + 70 * k, cy + -70 * k)
  ctx.bezierCurveTo(cx + 100 * k, cy + -40 * k, cx + 80 * k, cy + 20 * k, cx + 0 * k, cy + 80 * k)
  ctx.closePath()
}

function makeHeartPath2D(cx: number, cy: number, s: number): Path2D {
  const p = new Path2D()
  const k = s / 200
  p.moveTo(cx + 0 * k, cy + 80 * k)
  p.bezierCurveTo(cx + -80 * k, cy + 20 * k, cx + -100 * k, cy + -40 * k, cx + -70 * k, cy + -70 * k)
  p.bezierCurveTo(cx + -40 * k, cy + -100 * k, cx + 0 * k, cy + -80 * k, cx + 0 * k, cy + -50 * k)
  p.bezierCurveTo(cx + 0 * k, cy + -80 * k, cx + 40 * k, cy + -100 * k, cx + 70 * k, cy + -70 * k)
  p.bezierCurveTo(cx + 100 * k, cy + -40 * k, cx + 80 * k, cy + 20 * k, cx + 0 * k, cy + 80 * k)
  p.closePath()
  return p
}

function genCracks(cx: number, cy: number, sc: number): Crack[] {
  const cracks: Crack[] = []
  const n = 7 + Math.floor(Math.random() * 4)
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5
    const pts: Array<{ x: number; y: number }> = []
    let x = cx + Math.cos(a) * sc * 0.12
    let y = cy + Math.sin(a) * sc * 0.12
    pts.push({ x, y })
    const len = sc * (0.2 + Math.random() * 0.35)
    const segs = 4 + Math.floor(Math.random() * 4)
    let ca = a
    for (let j = 0; j < segs; j++) {
      const sl = len / segs
      ca += (Math.random() - 0.5) * 1.0
      x += Math.cos(ca) * sl
      y += Math.sin(ca) * sl
      pts.push({ x, y })
      if (Math.random() > 0.55 && j > 0) {
        const ba = ca + (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.9)
        const bl = sl * (0.35 + Math.random() * 0.55)
        cracks.push({ points: [{ x, y }, { x: x + Math.cos(ba) * bl, y: y + Math.sin(ba) * bl }] })
      }
    }
    cracks.push({ points: pts })
  }
  return cracks
}

function draw4Star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, a: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const ang = (Math.PI * 2 * i) / 4 - Math.PI / 2
    const ir = r * 0.4
    ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
    const ia = ang + Math.PI / 4
    ctx.lineTo(Math.cos(ia) * ir, Math.sin(ia) * ir)
  }
  ctx.closePath()
  ctx.globalAlpha = a
  ctx.fillStyle = '#fff8dc'
  ctx.fill()
  ctx.restore()
}

// ============================================================
// COMPONENT
// ============================================================
export const CrystalHeart = forwardRef<CrystalHeartHandle, Props>(({ onComplete }, ref) => {
  // DOM refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heartWrapRef = useRef<HTMLDivElement>(null)
  const heartInnerRef = useRef<HTMLDivElement>(null)
  const heartSvgRef = useRef<SVGSVGElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchTextRef = useRef<HTMLDivElement>(null)

  // Animation data refs (all mutable, no React re-renders)
  const collectedRef = useRef(0)
  const targetFillRef = useRef(0)
  const currentFillRef = useRef(0)
  const liquidVelRef = useRef(0)
  const splashAmpRef = useRef(0)
  const lastSplashTRef = useRef(0)
  const impactFlashRef = useRef(0)
  const pulseRef = useRef(0)
  const timeRef = useRef(0)
  const phaseRef = useRef<'filling' | 'zooming' | 'ready' | 'beating' | 'exploding' | 'transitioning'>('filling')
  const rafRef = useRef(0)
  const beamsRef = useRef<Beam[]>([])
  const particlesRef = useRef<Particle[]>([])
  const bubblesRef = useRef<Bubble[]>([])
  const cracksRef = useRef<Crack[]>([])
  const crackProgRef = useRef(0)
  const splashPartsRef = useRef<SplashParticle[]>([])
  const vibrateTRef = useRef(0)
  const isMobileRef = useRef(false)
  const heartSizeRef = useRef(110)
  const transProgRef = useRef(0)
  const explosionGlowRef = useRef(0)
  const canvasOpacityRef = useRef(1)

  // React state (UI only)
  const [showTouchText, setShowTouchText] = useState(false)
  const [showFloatHearts, setShowFloatHearts] = useState(false)
  const [pinkGlow, setPinkGlow] = useState(false)
  const [heartFilter, setHeartFilter] = useState('')
  const [clickable, setClickable] = useState(false)

  // Get heart center position on screen
  const getHeartCenter = useCallback(() => {
    if (!heartWrapRef.current) return { x: window.innerWidth / 2, y: window.innerHeight - 60 - heartSizeRef.current / 2 }
    const r = heartWrapRef.current.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, [])

  // Create a beam from star to heart
  const createBeam = useCallback((fromX: number, fromY: number) => {
    const hc = getHeartCenter()
    const tps: Beam['travelingParticles'] = []
    for (let i = 0; i < 14; i++) {
      tps.push({ t: Math.random() * 0.15, speed: 0.007 + Math.random() * 0.012, size: 1.5 + Math.random() * 2, offset: (Math.random() - 0.5) * 7 })
    }
    beamsRef.current.push({
      startX: fromX, startY: fromY, endX: hc.x, endY: hc.y,
      progress: 0, speed: 0.012 + Math.random() * 0.005,
      travelingParticles: tps, triggered: false,
    })
  }, [getHeartCenter])

  // Spawn explosion particles
  const spawnExplosion = useCallback(() => {
    const hc = getHeartCenter()
    const cx = hc.x, cy = hc.y
    const isM = isMobileRef.current

    // Wave 1: Rays (immediate radial burst)
    const rayCount = isM ? 12 : 25
    for (let i = 0; i < rayCount; i++) {
      const a = (Math.PI * 2 * i) / rayCount + (Math.random() - 0.5) * 0.2
      const sp = 10 + Math.random() * 15
      particlesRef.current.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rotation: a, rotationSpeed: 0, size: 60 + Math.random() * 140, color: '#fbbf24', opacity: 0.7, life: 1, maxLife: 1, decay: 0.018 + Math.random() * 0.012, type: 'ray', gravity: 0, drag: 0.025 })
    }

    // Wave 2: Shards (crystal pieces)
    setTimeout(() => {
      const shardCount = isM ? 20 : 50
      for (let i = 0; i < shardCount; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 2 + Math.random() * 8
        particlesRef.current.push({ x: cx + (Math.random() - 0.5) * 20, y: cy + (Math.random() - 0.5) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.12, size: 4 + Math.random() * 14, color: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)], opacity: 0.85, life: 1, maxLife: 1, decay: 0.006 + Math.random() * 0.005, type: 'shard', gravity: 0.05, drag: 0.01 })
      }
    }, 40)

    // Wave 3: Mini hearts + stars
    setTimeout(() => {
      const mhCount = isM ? 12 : 30
      for (let i = 0; i < mhCount; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 1 + Math.random() * 4
        particlesRef.current.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.06, size: 5 + Math.random() * 9, color: '#f43f5e', opacity: 0.8, life: 1, maxLife: 1, decay: 0.003, type: 'miniHeart', gravity: -0.025, drag: 0.008 })
      }
      const starCount = isM ? 20 : 50
      for (let i = 0; i < starCount; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 3 + Math.random() * 9
        particlesRef.current.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.1, size: 2.5 + Math.random() * 5, color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)], opacity: 0.9, life: 1, maxLife: 1, decay: 0.008 + Math.random() * 0.005, type: 'star', gravity: 0.015, drag: 0.01 })
      }
    }, 120)

    // Wave 4: Sparks + dust
    setTimeout(() => {
      const sparkCount = isM ? 60 : 140
      for (let i = 0; i < sparkCount; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 4 + Math.random() * 14
        particlesRef.current.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rotation: 0, rotationSpeed: 0, size: 1.2 + Math.random() * 3.5, color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)], opacity: 1, life: 1, maxLife: 1, decay: 0.012 + Math.random() * 0.012, type: 'spark', gravity: 0.035, drag: 0.016 })
      }
      const dustCount = isM ? 40 : 100
      for (let i = 0; i < dustCount; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 0.5 + Math.random() * 3
        particlesRef.current.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rotation: 0, rotationSpeed: 0, size: 0.8 + Math.random() * 2, color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)], opacity: 0.6, life: 1, maxLife: 1, decay: 0.002 + Math.random() * 0.003, type: 'dust', gravity: 0.004, drag: 0.004 })
      }
    }, 80)
  }, [getHeartCenter])

  // ---- CANVAS DRAWING ----
  const drawLiquid = useCallback((ctx: CanvasRenderingContext2D, hc: { x: number; y: number }, t: number) => {
    const fill = currentFillRef.current
    if (fill <= 0.005) return

    const hs = heartSizeRef.current
    const hb = hc.y + hs * 0.4
    const ht = hc.y - hs * 0.35
    const liquidH = (hb - ht) * Math.min(fill, 1)
    const lt = hb - liquidH

    // Liquid body (clipped to heart)
    ctx.save()
    const hp = makeHeartPath2D(hc.x, hc.y, hs)
    ctx.clip(hp)

    // Liquid gradient
    const lg = ctx.createLinearGradient(0, lt, 0, hb)
    lg.addColorStop(0, 'rgba(220, 20, 60, 0.92)')
    lg.addColorStop(0.25, 'rgba(190, 20, 55, 0.93)')
    lg.addColorStop(0.6, 'rgba(140, 10, 40, 0.94)')
    lg.addColorStop(1, 'rgba(90, 0, 25, 0.96)')

    // Wave surface
    const hl = hc.x - hs * 0.5
    const hr = hc.x + hs * 0.5
    const hw = hr - hl

    ctx.beginPath()
    ctx.moveTo(hl, hb)
    ctx.lineTo(hl, lt)

    const st = lastSplashTRef.current
    const sa = splashAmpRef.current

    for (let px = hl; px <= hr; px += 2) {
      const nx = (px - hl) / hw
      let wy = 0
      wy += Math.sin(nx * Math.PI * 2 + t * 1.7) * 3.2
      wy += Math.sin(nx * Math.PI * 5 + t * 2.5 + 1.2) * 1.7
      wy += Math.sin(nx * Math.PI * 9 + t * 4.0 + 2.5) * 0.85
      wy += Math.sin(nx * Math.PI * 15 + t * 5.5 + 3.8) * 0.35
      if (sa > 0.3 && st > 0) {
        const el = t - st
        const dc = Math.exp(-el * 1.8)
        wy += Math.sin(nx * Math.PI * 4 + el * 7) * sa * dc * 4.5
      }
      ctx.lineTo(px, lt + wy)
    }

    ctx.lineTo(hr, hb)
    ctx.closePath()
    ctx.fillStyle = lg
    ctx.fill()

    // Liquid inner glow (edge)
    ctx.save()
    ctx.clip(hp)
    ctx.strokeStyle = 'rgba(255, 60, 100, 0.35)'
    ctx.lineWidth = 10
    ctx.shadowColor = '#ff3860'
    ctx.shadowBlur = 20
    heartPathOnCanvas(ctx, hc.x, hc.y, hs)
    ctx.stroke()
    ctx.restore()

    // Bubbles
    const maxBubs = isMobileRef.current ? 10 : 20
    if (bubblesRef.current.length < maxBubs && Math.random() < 0.06) {
      bubblesRef.current.push({
        x: hc.x + (Math.random() - 0.5) * hs * 0.45,
        y: hb - 5,
        size: 1.5 + Math.random() * 2.5,
        speed: 0.3 + Math.random() * 0.6,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.5 + Math.random() * 2.5,
        wobbleAmp: 0.2 + Math.random() * 0.45,
        opacity: 0.2 + Math.random() * 0.25,
      })
    }

    for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
      const b = bubblesRef.current[i]
      b.y -= b.speed
      b.x += Math.sin(t * b.wobbleSpeed + b.wobble) * b.wobbleAmp
      b.wobbleAmp *= 0.9995

      if (b.y < lt + 5) {
        bubblesRef.current.splice(i, 1)
        continue
      }

      const bg = ctx.createRadialGradient(b.x - b.size * 0.25, b.y - b.size * 0.3, b.size * 0.1, b.x, b.y, b.size)
      bg.addColorStop(0, `rgba(255, 230, 230, ${0.45 * b.opacity * fill})`)
      bg.addColorStop(0.5, `rgba(255, 180, 180, ${0.18 * b.opacity * fill})`)
      bg.addColorStop(1, `rgba(255, 150, 150, ${0.04 * b.opacity * fill})`)
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.fillStyle = bg
      ctx.fill()

      // Highlight
      ctx.beginPath()
      ctx.arc(b.x - b.size * 0.25, b.y - b.size * 0.3, b.size * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * b.opacity * fill})`
      ctx.fill()
    }

    // Surface sparkles
    const nSparkles = Math.floor(fill * 10)
    for (let i = 0; i < nSparkles; i++) {
      const sx = hl + (0.12 + (i / Math.max(nSparkles, 1)) * 0.76 + Math.sin(i * 2.5) * 0.08) * hw
      const nx = (sx - hl) / hw
      let wy = 0
      wy += Math.sin(nx * Math.PI * 2 + t * 1.7) * 3.2
      wy += Math.sin(nx * Math.PI * 5 + t * 2.5 + 1.2) * 1.7
      wy += Math.sin(nx * Math.PI * 9 + t * 4.0 + 2.5) * 0.85
      const sa2 = splashAmpRef.current
      const st2 = lastSplashTRef.current
      if (sa2 > 0.3 && st2 > 0) {
        const el = t - st2
        const dc = Math.exp(-el * 1.8)
        wy += Math.sin(nx * Math.PI * 4 + el * 7) * sa2 * dc * 4.5
      }
      const sy = lt + wy
      const tw = Math.sin(t * 2.8 + i * 1.6) * 0.5 + 0.5
      if (tw < 0.15) continue

      ctx.beginPath()
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 240, 170, ${tw * fill * 0.7})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 220, 100, ${tw * fill * 0.1})`
      ctx.fill()
    }

    ctx.restore()
  }, [])

  const drawBeams = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    for (let bi = beamsRef.current.length - 1; bi >= 0; bi--) {
      const b = beamsRef.current[bi]
      b.progress += b.speed

      const cp = getCurveControl(b.startX, b.startY, b.endX, b.endY)

      // Draw beam path
      ctx.save()
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 18
      const steps = Math.floor(b.progress * 80)
      for (let i = 0; i < steps; i++) {
        const t1 = i / 80
        const t2 = (i + 1) / 80
        const p1 = getBezierPoint(t1, { x: b.startX, y: b.startY }, cp, { x: b.endX, y: b.endY })
        const p2 = getBezierPoint(t2, { x: b.startX, y: b.startY }, cp, { x: b.endX, y: b.endY })
        const fo = 1 - t1 / Math.max(b.progress, 0.01)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.75 * fo})`
        ctx.lineWidth = 4.5 * fo
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      ctx.restore()

      // Traveling sparkles
      for (const tp of b.travelingParticles) {
        if (tp.t > 1) { tp.t = -Math.random() * 0.1; continue }
        if (tp.t < 0) { tp.t += tp.speed; continue }
        const pos = getBezierPoint(tp.t, { x: b.startX, y: b.startY }, cp, { x: b.endX, y: b.endY })
        const dt = 0.008
        const pn = getBezierPoint(tp.t + dt, { x: b.startX, y: b.startY }, cp, { x: b.endX, y: b.endY })
        const ang = Math.atan2(pn.y - pos.y, pn.x - pos.x) + Math.PI / 2
        const ox = Math.cos(ang) * tp.offset
        const oy = Math.sin(ang) * tp.offset

        ctx.save()
        ctx.shadowColor = '#fde047'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(pos.x + ox, pos.y + oy, tp.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 230, 0.95)`
        ctx.fill()
        ctx.restore()

        tp.t += tp.speed
      }

      // Hit!
      if (b.progress >= 1 && !b.triggered) {
        b.triggered = true
        targetFillRef.current = Math.min(1, targetFillRef.current + 1 / 18)
        splashAmpRef.current = 10
        lastSplashTRef.current = t
        impactFlashRef.current = 0.5
        pulseRef.current = 0.35

        // Spawn splash particles
        for (let i = 0; i < 8; i++) {
          splashPartsRef.current.push({
            x: b.endX + (Math.random() - 0.5) * 25,
            y: b.endY + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 4.5,
            vy: -Math.random() * 3.5 - 0.8,
            size: 1.5 + Math.random() * 2.5,
            opacity: 0.8,
            life: 1,
            decay: 0.018 + Math.random() * 0.01,
          })
        }
      }

      if (b.progress >= 1.4) {
        beamsRef.current.splice(bi, 1)
      }
    }
  }, [])

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const ps = particlesRef.current
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.vx *= (1 - p.drag)
      p.vy *= (1 - p.drag)
      p.vy += p.gravity
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.life -= p.decay

      if (p.life <= 0) { ps.splice(i, 1); continue }

      const alpha = Math.min(1, p.life / 0.08) * (p.life > 0.85 ? (1 - p.life) / 0.15 : 1) * p.opacity
      if (alpha < 0.005) continue

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = alpha

      switch (p.type) {
        case 'shard': {
          ctx.beginPath()
          ctx.moveTo(-p.size * 0.5, -p.size * 0.45)
          ctx.lineTo(p.size * 0.45, -p.size * 0.3)
          ctx.lineTo(p.size * 0.15, p.size * 0.5)
          ctx.lineTo(-p.size * 0.35, p.size * 0.25)
          ctx.closePath()
          ctx.fillStyle = p.color
          ctx.shadowColor = p.color
          ctx.shadowBlur = 6
          ctx.fill()
          break
        }
        case 'spark': {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.shadowColor = p.color
          ctx.shadowBlur = 10
          ctx.fill()
          break
        }
        case 'miniHeart': {
          const s = p.size / 24
          ctx.scale(s, s)
          ctx.beginPath()
          ctx.moveTo(12, 21)
          ctx.bezierCurveTo(12, 21, 2, 14.5, 2, 8.5)
          ctx.bezierCurveTo(2, 4.5, 5.5, 2.5, 8.5, 2.5)
          ctx.bezierCurveTo(10.5, 2.5, 12, 3.5, 12, 5.5)
          ctx.bezierCurveTo(12, 3.5, 13.5, 2.5, 15.5, 2.5)
          ctx.bezierCurveTo(18.5, 2.5, 22, 4.5, 22, 8.5)
          ctx.bezierCurveTo(22, 14.5, 12, 21, 12, 21)
          ctx.fillStyle = p.color
          ctx.shadowColor = '#f43f5e'
          ctx.shadowBlur = 8
          ctx.fill()
          break
        }
        case 'star': {
          draw4Star(ctx, 0, 0, p.size, p.rotation, 1)
          break
        }
        case 'dust': {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = alpha * 0.55
          ctx.fill()
          break
        }
        case 'ray': {
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(p.size, 0)
          const g = ctx.createLinearGradient(0, 0, p.size, 0)
          g.addColorStop(0, `rgba(251, 191, 36, ${alpha * 0.7})`)
          g.addColorStop(0.4, `rgba(251, 191, 36, ${alpha * 0.25})`)
          g.addColorStop(1, 'rgba(251, 191, 36, 0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 2.5
          ctx.stroke()
          break
        }
      }
      ctx.restore()
    }
  }, [])

  const drawCracks = useCallback((ctx: CanvasRenderingContext2D, _hc: { x: number; y: number }) => {
    const prog = crackProgRef.current
    if (prog <= 0) return
    for (const crack of cracksRef.current) {
      const vis = Math.floor(crack.points.length * Math.min(1, prog * 1.3))
      if (vis < 2) continue
      ctx.beginPath()
      ctx.moveTo(crack.points[0].x, crack.points[0].y)
      for (let i = 1; i < vis; i++) ctx.lineTo(crack.points[i].x, crack.points[i].y)
      ctx.strokeStyle = `rgba(251, 220, 140, ${0.45 + prog * 0.55})`
      ctx.lineWidth = 1.2 + prog * 1.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 10 + prog * 18
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [])

  // ---- MAIN ANIMATION LOOP ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    isMobileRef.current = window.innerWidth < 768
    heartSizeRef.current = isMobileRef.current ? 75 : 115

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      isMobileRef.current = window.innerWidth < 768
      heartSizeRef.current = isMobileRef.current ? 75 : 115
    }
    resize()
    window.addEventListener('resize', resize)

    const cvs = canvas
    let running = true
    function loop() {
      if (!running) return
      const dt = 0.016
      timeRef.current += dt
      const t = timeRef.current

      ctx.clearRect(0, 0, cvs.width, cvs.height)
      ctx.globalAlpha = canvasOpacityRef.current

      const hc = ((): { x: number; y: number } => {
        if (!heartWrapRef.current) return { x: cvs.width / 2, y: cvs.height / 2 }
        const r = heartWrapRef.current.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      })()

      const phase = phaseRef.current
      const hs = heartSizeRef.current

      // Liquid physics
      const fillDiff = targetFillRef.current - currentFillRef.current
      liquidVelRef.current += fillDiff * 0.035
      liquidVelRef.current *= 0.88
      currentFillRef.current += liquidVelRef.current
      splashAmpRef.current *= 0.935
      impactFlashRef.current *= 0.9
      pulseRef.current *= 0.94

      // Draw liquid
      drawLiquid(ctx, hc, t)

      // Draw beams
      drawBeams(ctx, t)

      // Impact flash
      if (impactFlashRef.current > 0.01) {
        const ifg = ctx.createRadialGradient(hc.x, hc.y, 0, hc.x, hc.y, hs * 0.4)
        ifg.addColorStop(0, `rgba(255, 240, 200, ${impactFlashRef.current * 0.5})`)
        ifg.addColorStop(1, 'rgba(255, 240, 200, 0)')
        ctx.fillStyle = ifg
        ctx.beginPath()
        ctx.arc(hc.x, hc.y, hs * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Splash particles
      for (let i = splashPartsRef.current.length - 1; i >= 0; i--) {
        const sp = splashPartsRef.current[i]
        sp.x += sp.vx
        sp.y += sp.vy
        sp.vy += 0.12
        sp.life -= sp.decay
        if (sp.life <= 0) { splashPartsRef.current.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(251, 191, 36, ${sp.life * sp.opacity})`
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 4
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Explosion / transition particles
      drawParticles(ctx)

      // Cracks
      if (phase === 'beating' || phase === 'exploding' || phase === 'transitioning') {
        drawCracks(ctx, hc)
      }

      // Explosion center glow
      if (phase === 'exploding' || phase === 'transitioning') {
        explosionGlowRef.current = Math.max(0, explosionGlowRef.current - 0.003)
        const eg = Math.min(1, particlesRef.current.length / 50) * 0.4
        explosionGlowRef.current = Math.max(explosionGlowRef.current, eg)
        const gr = ctx.createRadialGradient(hc.x, hc.y, 0, hc.x, hc.y, 500)
        gr.addColorStop(0, `rgba(255, 235, 180, ${explosionGlowRef.current * 0.5})`)
        gr.addColorStop(0.3, `rgba(251, 191, 36, ${explosionGlowRef.current * 0.25})`)
        gr.addColorStop(0.7, `rgba(245, 158, 11, ${explosionGlowRef.current * 0.08})`)
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gr
        ctx.fillRect(0, 0, cvs.width, cvs.height)
      }

      // Transition glow (lingering)
      if (phase === 'transitioning') {
        transProgRef.current += 0.004
        const tp = Math.min(1, transProgRef.current)
        const radius = 200 + tp * 1000
        const g = ctx.createRadialGradient(hc.x, hc.y, 0, hc.x, hc.y, radius)
        g.addColorStop(0, `rgba(255, 230, 170, ${0.4 * (1 - tp)})`)
        g.addColorStop(0.4, `rgba(251, 191, 36, ${0.2 * (1 - tp)})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        // Fade canvas
        canvasOpacityRef.current = Math.max(0, 1 - tp * 1.5)

        if (tp >= 1) {
          onComplete()
          running = false
        }
      }

      // Update heart filter based on fill
      if (phase === 'filling') {
        const nf = Math.min(1, collectedRef.current / 18)
        const br = 1 + nf * 0.45 + pulseRef.current * 0.5
        const gs2 = nf * 22 + pulseRef.current * 30
        const go = nf * 0.55 + pulseRef.current * 0.4
        setHeartFilter(`brightness(${br}) drop-shadow(0 0 ${gs2}px rgba(244,63,94,${go})) drop-shadow(0 0 ${gs2 * 0.4}px rgba(251,191,36,${go * 0.45}))`)

        // Check thresholds
        if (collectedRef.current >= 9 && !pinkGlow) setPinkGlow(true)
        if (collectedRef.current >= 14 && !showFloatHearts) setShowFloatHearts(true)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [drawLiquid, drawBeams, drawParticles, drawCracks, onComplete, pinkGlow, showFloatHearts])

  // ---- IMPERATIVE HANDLE ----
  useImperativeHandle(ref, () => ({
    triggerBeam: (fromX: number, fromY: number) => {
      collectedRef.current++
      createBeam(fromX, fromY)
    },
    startCinematicSequence: () => {
      if (phaseRef.current !== 'filling') return
      phaseRef.current = 'zooming'

      // Brilliant flash at 100%
      const nf = 1
      const br = 1 + nf * 0.45
      setHeartFilter(`brightness(${br}) drop-shadow(0 0 35px rgba(244,63,94,0.8)) drop-shadow(0 0 15px rgba(251,191,36,0.5))`)

      // Timeline
      const tl = gsap.timeline({ onComplete: () => setClickable(true) })

      // 1. Darken background
      tl.to(overlayRef.current, { opacity: 0.92, duration: 2.2, ease: 'power2.inOut' })

      // 2. Heart floats to center & scales
      const targetScale = Math.min(window.innerWidth, window.innerHeight) * 0.78 / heartSizeRef.current
      tl.to(heartWrapRef.current, {
        bottom: '50%',
        y: '40%',
        scale: targetScale,
        duration: 3.5,
        ease: 'power1.inOut',
      }, 0.4)

      // 3. Show touch text
      tl.call(() => setShowTouchText(true), [], 3.8)
      tl.fromTo(touchTextRef.current, { opacity: 0, y: 50, letterSpacing: '0.25em' }, {
        opacity: 1, y: 0, letterSpacing: '0.04em', duration: 1.2, ease: 'power3.out',
      }, 3.8)

      // 4. Pause
      tl.to({}, { duration: 2.5 })

      // 5. Pulse hint
      tl.to(heartInnerRef.current, { scale: 1.06, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 5)
    },
  }), [createBeam])

  // ---- HEART CLICK (One last touch...) ----
  const handleHeartClick = useCallback(() => {
    if (phaseRef.current !== 'filling' && phaseRef.current !== 'ready') return
    phaseRef.current = 'beating'
    setClickable(false)

    // Kill pulse hint
    gsap.killTweensOf(heartInnerRef.current)
    gsap.set(heartInnerRef.current, { scale: 1 })

    // Hide touch text
    gsap.to(touchTextRef.current, { opacity: 0, y: -30, duration: 0.5, ease: 'power2.in' })

    // 3 Heartbeats
    const btl = gsap.timeline()

    // Beat 1
    btl.to(heartInnerRef.current, { scale: 1.2, duration: 0.14, ease: 'power3.out' })
        .to(heartInnerRef.current, { scale: 1, duration: 0.14, ease: 'power3.in' })
        .to({}, { duration: 0.35 })

    // Beat 2
        .to(heartInnerRef.current, { scale: 1.38, duration: 0.11, ease: 'power4.out' })
        .to(heartInnerRef.current, { scale: 1, duration: 0.11, ease: 'power4.in' })
        .to({}, { duration: 0.28 })

    // Beat 3
        .to(heartInnerRef.current, { scale: 1.58, duration: 0.09, ease: 'power4.out' })
        .to(heartInnerRef.current, { scale: 1, duration: 0.09, ease: 'power4.in' })
        .to({}, { duration: 0.2 })

    // Cracks appear
        .call(() => {
          const hc = ((): { x: number; y: number } => {
            if (!heartWrapRef.current) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
            const r = heartWrapRef.current.getBoundingClientRect()
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          })()
          cracksRef.current = genCracks(hc.x, hc.y, heartSizeRef.current * (heartWrapRef.current ? parseFloat(getComputedStyle(heartWrapRef.current).transform?.split(',')[3] || '1') : 1))
          gsap.to(crackProgRef, { current: 1, duration: 1.2, ease: 'power2.out' })
        })
        .to({}, { duration: 1.0 })

    // Vibration
        .call(() => {
          vibrateTRef.current = 0
          let vFrames = 0
          const maxVFrames = 45
          function vibrate() {
            if (phaseRef.current !== 'beating' && phaseRef.current !== 'exploding') return
            if (vFrames >= maxVFrames) {
              // Start explosion
              phaseRef.current = 'exploding'
              explosionGlowRef.current = 0.8
              spawnExplosion()

              // Fade heart SVG
              gsap.to(heartWrapRef.current, { opacity: 0, duration: 0.3 })

              // After explosion settles, start transition
              setTimeout(() => {
                phaseRef.current = 'transitioning'
                // Fade overlay
                gsap.to(overlayRef.current, { opacity: 0, duration: 4, ease: 'power2.inOut' })
              }, 3500)
              return
            }
            const intensity = 4 * (vFrames / maxVFrames)
            const ox = (Math.random() - 0.5) * intensity
            const oy = (Math.random() - 0.5) * intensity
            if (heartInnerRef.current) {
              heartInnerRef.current.style.transform = `translate(${ox}px, ${oy}px)`
            }
            vFrames++
            requestAnimationFrame(vibrate)
          }
          vibrate()
        })
  }, [spawnExplosion])

  return (
    <div className="crystal-heart-system">
      {/* Full-screen effects canvas */}
      <canvas ref={canvasRef} className="crystal-canvas" />

      {/* Dark overlay */}
      <div ref={overlayRef} className="crystal-overlay" />

      {/* Heart container */}
      <div
        ref={heartWrapRef}
        className={`crystal-heart-wrap ${clickable ? 'clickable' : ''}`}
        onClick={handleHeartClick}
      >
        <div ref={heartInnerRef} className="crystal-heart-inner">
          <svg
            ref={heartSvgRef}
            viewBox="0 0 200 200"
            className="crystal-heart-svg"
            style={{ filter: heartFilter }}
          >
            <defs>
              <filter id="cgf" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="7" result="b" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.35" />
                <feComposite in2="b" operator="in" />
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="cpg" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" result="b" />
                <feFlood floodColor="#f43f5e" floodOpacity="0.28" />
                <feComposite in2="b" operator="in" />
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id="cgb" cx="32%" cy="28%" r="68%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
                <stop offset="25%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="65%" stopColor="rgba(210,235,255,0.06)" />
                <stop offset="88%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.17)" />
              </radialGradient>
              <radialGradient id="cgh" cx="30%" cy="24%" r="28%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.94)" />
                <stop offset="45%" stopColor="rgba(255,255,255,0.38)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <linearGradient id="cgs" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="30%" stopColor="#fbbf24" />
                <stop offset="55%" stopColor="#fde047" />
                <stop offset="75%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <path id="chp" d="M100,180 C20,120,0,60,30,30 C60,0,100,20,100,50 C100,20,140,0,170,30 C200,60,180,120,100,180 Z" />
            </defs>

            {/* Pink glow layer (50%+) */}
            <use href="#chp" fill="none" stroke="#f43f5e" strokeWidth="4"
              filter="url(#cpg)" opacity={pinkGlow ? 0.85 : 0}
              style={{ transition: 'opacity 1.5s ease' }} />

            {/* Gold glow */}
            <use href="#chp" fill="none" stroke="#fbbf24" strokeWidth="2.5"
              filter="url(#cgf)" opacity="0.75" />

            {/* Glass body */}
            <use href="#chp" fill="url(#cgb)" stroke="url(#cgs)" strokeWidth="1.5" />

            {/* Inner shadow */}
            <use href="#chp" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3"
              transform="scale(0.94) translate(6.4,6.4)" />

            {/* Highlight */}
            <ellipse cx="62" cy="52" rx="27" ry="20" fill="url(#cgh)" />

            {/* Bottom reflection */}
            <ellipse cx="100" cy="152" rx="33" ry="12" fill="rgba(255,255,255,0.055)" />
          </svg>

          {/* Floating orbit hearts (75%+) */}
          {showFloatHearts && (
            <div className="orbit-hearts-container">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="orbit-heart"
                  style={{
                    animationDelay: `${i * 0.35}s`,
                    animationDuration: `${2.8 + (i % 4) * 0.7}s`,
                    width: `${10 + (i % 3) * 4}px`,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="#f43f5e" style={{ width: '100%', height: '100%' }}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Touch text */}
        <div
          ref={touchTextRef}
          className={`touch-text ${showTouchText ? 'visible' : ''}`}
        >
          One last touch... <span className="heart-emoji">&#10084;</span>
        </div>
      </div>
    </div>
  )
})

CrystalHeart.displayName = 'CrystalHeart'