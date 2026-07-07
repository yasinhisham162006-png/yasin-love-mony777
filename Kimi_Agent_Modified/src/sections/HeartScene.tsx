import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

interface HeartSceneProps {
  isActive: boolean
  onHeartClick: () => void
}

// Create heart particles that burst outward
function createHeartBurst(x: number, y: number) {
  const colors = ['#ef4444', '#f43f5e', '#fbbf24', '#fde047', '#ffffff', '#f472b6']
  const particleCount = 50

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
    const speed = 3 + Math.random() * 8
    const size = 4 + Math.random() * 8
    const color = colors[Math.floor(Math.random() * colors.length)]

    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 200;
      box-shadow: 0 0 ${size * 2}px ${color};
    `
    document.body.appendChild(particle)

    const dx = Math.cos(angle) * speed * (30 + Math.random() * 50)
    const dy = Math.sin(angle) * speed * (30 + Math.random() * 50)

    gsap.to(particle, {
      x: dx,
      y: dy,
      opacity: 0,
      scale: 0,
      duration: 1.5 + Math.random(),
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    })
  }
}

// Create a flash of light effect
function createLightFlash(onComplete: () => void) {
  const flash = document.createElement('div')
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle at center, rgba(251, 191, 36, 0.9) 0%, rgba(245, 158, 11, 0.6) 30%, rgba(0, 0, 0, 0.8) 70%);
    z-index: 150;
    pointer-events: none;
    opacity: 0;
  `
  document.body.appendChild(flash)

  gsap.timeline({
    onComplete: () => {
      flash.remove()
      onComplete()
    },
  })
    .to(flash, { opacity: 1, duration: 0.6, ease: 'power2.out' })
    .to(flash, { opacity: 0, duration: 1.2, ease: 'power2.inOut' }, '+=0.3')
}

export default function HeartScene({ isActive, onHeartClick }: HeartSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const heartRef = useRef<HTMLDivElement>(null)
  const hasClicked = useRef(false)

  const handleHeartClick = useCallback(() => {
    if (hasClicked.current) return
    hasClicked.current = true

    const heart = heartRef.current
    if (!heart) return

    // Get heart center position
    const rect = heart.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Create particle burst
    createHeartBurst(centerX, centerY)

    // Animate heart out
    gsap.to(heart, {
      scale: 2,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    })

    // Create light flash then transition
    setTimeout(() => {
      createLightFlash(() => {
        onHeartClick()
      })
    }, 300)
  }, [onHeartClick])

  useEffect(() => {
    if (isActive && heartRef.current) {
      gsap.from(heartRef.current, {
        scale: 0,
        rotation: -180,
        duration: 1.5,
        ease: 'elastic.out(1, 0.3)',
        delay: 0.5,
      })
    }
  }, [isActive])

  return (
    <div ref={sceneRef} className={`heart-scene ${isActive ? 'active' : ''}`}>
      {isActive && (
        <div
          ref={heartRef}
          className="revealed-heart"
          onClick={handleHeartClick}
          role="button"
          tabIndex={0}
          aria-label="Click the heart"
        />
      )}
    </div>
  )
}