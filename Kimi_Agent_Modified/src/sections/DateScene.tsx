import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface DateSceneProps {
  isActive: boolean
  onSwipeUp: () => void
}

// Floating particles around the date
function createFloatingParticles(container: HTMLDivElement) {
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div')
    const size = 2 + Math.random() * 4
    const x = Math.random() * 100
    const y = Math.random() * 100
    const duration = 3 + Math.random() * 4
    const delay = Math.random() * 3

    particle.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
      width: ${size}px;
      height: ${size}px;
      background: ${Math.random() > 0.5 ? '#fbbf24' : '#ffffff'};
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      box-shadow: 0 0 ${size * 3}px ${Math.random() > 0.5 ? 'rgba(251, 191, 36, 0.6)' : 'rgba(255, 255, 255, 0.4)'};
    `
    container.appendChild(particle)

    gsap.to(particle, {
      opacity: 0.6,
      y: -30 - Math.random() * 50,
      x: (Math.random() - 0.5) * 30,
      duration,
      delay,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  }
}

export default function DateScene({ isActive, onSwipeUp }: DateSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const particleContainerRef = useRef<HTMLDivElement>(null)
  const [showSwipeUp, setShowSwipeUp] = useState(false)

  useEffect(() => {
    if (isActive) {
      // Animate date in
      if (dateRef.current) {
        gsap.from(dateRef.current, {
          y: 100,
          opacity: 0,
          duration: 1.5,
          delay: 0.3,
          ease: 'power3.out',
        })
      }

      // Animate subtitle in
      if (subtitleRef.current) {
        gsap.from(subtitleRef.current, {
          y: 50,
          opacity: 0,
          duration: 1.5,
          delay: 0.8,
          ease: 'power3.out',
        })
      }

      // Create floating particles
      if (particleContainerRef.current) {
        createFloatingParticles(particleContainerRef.current)
      }

      // Show swipe up after delay
      const timer = setTimeout(() => {
        setShowSwipeUp(true)
      }, 3500)

      return () => clearTimeout(timer)
    }
  }, [isActive])

  // Handle scroll to transition to garden
  useEffect(() => {
    if (!isActive || !showSwipeUp) return

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 30) {
        // Scrolled down → reveal garden
        onSwipeUp()
      }
    }

    let touchStartY = 0
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY
      if (touchStartY - touchEndY > 60) {
        // Swiped up → reveal garden
        onSwipeUp()
      }
    }

    window.addEventListener('wheel', handleWheel)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isActive, showSwipeUp, onSwipeUp])

  return (
    <div ref={sceneRef} className={`date-scene ${isActive ? 'active' : ''}`}>
      <div
        ref={particleContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <h1 ref={dateRef} className="birthday-date">
          07 • 07 • 2008
        </h1>
        <p ref={subtitleRef} className="date-subtitle">
          The day my world became perfect
        </p>
      </div>

      {showSwipeUp && (
        <div className="swipe-up-indicator" onClick={onSwipeUp}>
          <span>Swipe Up</span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      )}
    </div>
  )
}