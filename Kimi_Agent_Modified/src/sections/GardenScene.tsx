import { useEffect, useRef, useState } from 'react'

// ====== CONFIGURATION ====== //
// EDIT THIS TO CUSTOMIZE THE BIRTHDAY MESSAGE
const BIRTHDAY_MESSAGE = [
  'My Dearest Love,',
  '',
  'On this special day, I want you to know that',
  'you are the most beautiful gift life has ever given me.',
  'Every moment with you feels like a dream I never want to wake from.',
  '',
  'Your smile is the first thing I think of every morning,',
  'and your laughter is the melody that fills my heart with joy.',
  'You have this incredible way of making everything better,',
  'just by being yourself.',
  '',
  'I am endlessly grateful for your love, your kindness,',
  'and the warmth you bring into my world.',
  'You are my best friend, my soulmate, my everything.',
  '',
  'Today, I celebrate not just your birthday,',
  'but the wonderful, amazing person you are.',
  'I promise to love you more with each passing day,',
  'to cherish every moment we share,',
  'and to always be by your side.',
  '',
  'Happy Birthday, my love.',
  'You are my forever.',
]

const SIGNATURE = 'With all my love,\nForever Yours'

interface GardenSceneProps {
  isActive: boolean
}

export default function GardenScene({ isActive }: GardenSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visibleLines, setVisibleLines] = useState(0)
  const [showSignature, setShowSignature] = useState(false)
  const animationFrameRef = useRef<number>(0)

  // Falling leaves canvas animation
  useEffect(() => {
    if (!isActive || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Leaf particles
    interface Leaf {
      x: number
      y: number
      size: number
      speedY: number
      speedX: number
      rotation: number
      rotationSpeed: number
      opacity: number
      color: string
      swayOffset: number
      swaySpeed: number
    }

    const leaves: Leaf[] = []
    const leafColors = [
      'rgba(34, 197, 94, 0.7)',   // green-500
      'rgba(22, 163, 74, 0.6)',   // green-600
      'rgba(21, 128, 61, 0.5)',   // green-700
      'rgba(251, 191, 36, 0.5)',  // amber-400
      'rgba(245, 158, 11, 0.4)',  // amber-500
    ]

    for (let i = 0; i < 25; i++) {
      leaves.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: 8 + Math.random() * 14,
        speedY: 0.3 + Math.random() * 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.4 + Math.random() * 0.4,
        color: leafColors[Math.floor(Math.random() * leafColors.length)],
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.02,
      })
    }

    function drawLeaf(leaf: Leaf) {
      ctx.save()
      ctx.translate(leaf.x, leaf.y)
      ctx.rotate(leaf.rotation)
      ctx.globalAlpha = leaf.opacity
      ctx.fillStyle = leaf.color

      // Draw a simple leaf shape
      ctx.beginPath()
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Leaf vein
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(-leaf.size * 0.8, 0)
      ctx.lineTo(leaf.size * 0.8, 0)
      ctx.stroke()

      ctx.restore()
    }

    let time = 0

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time++

      for (const leaf of leaves) {
        // Update position
        leaf.y += leaf.speedY
        leaf.x += leaf.speedX + Math.sin(time * leaf.swaySpeed + leaf.swayOffset) * 0.5
        leaf.rotation += leaf.rotationSpeed

        // Reset if off screen
        if (leaf.y > canvas.height + leaf.size) {
          leaf.y = -leaf.size
          leaf.x = Math.random() * canvas.width
        }
        if (leaf.x < -leaf.size) leaf.x = canvas.width + leaf.size
        if (leaf.x > canvas.width + leaf.size) leaf.x = -leaf.size

        drawLeaf(leaf)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isActive])

  // Line-by-line text reveal
  useEffect(() => {
    if (!isActive) return

    let currentLine = 0
    const totalLines = BIRTHDAY_MESSAGE.length

    const interval = setInterval(() => {
      if (currentLine < totalLines) {
        setVisibleLines(currentLine + 1)
        currentLine++
      } else {
        clearInterval(interval)
        // Show signature after message completes
        setTimeout(() => {
          setShowSignature(true)
        }, 800)
      }
    }, 600)

    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div ref={sceneRef} className={`garden-scene ${isActive ? 'active' : ''}`}>
      {/* Background Image */}
      <img
        src="/garden-sunset.jpg"
        alt="Romantic garden sunset"
        className="garden-background"
      />

      {/* Dark overlay */}
      <div className="garden-overlay" />

      {/* Falling leaves canvas */}
      <canvas ref={canvasRef} className="leaves-canvas" />

      {/* Content */}
      <div className="garden-content">
        <div className="love-letter-container">
          <h2 className="love-letter-title">Happy Birthday</h2>

          <div className="love-letter-text">
            {BIRTHDAY_MESSAGE.map((line, index) => (
              <div
                key={index}
                className={`love-letter-line ${index < visibleLines ? 'visible' : ''}`}
                style={{ minHeight: line === '' ? '0.8em' : 'auto' }}
              >
                {line === '' ? '\u00A0' : line}
              </div>
            ))}
          </div>

          <div
            className={`love-letter-signature ${showSignature ? 'visible' : ''}`}
          >
            {SIGNATURE.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}