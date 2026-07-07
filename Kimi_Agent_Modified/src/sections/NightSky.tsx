import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

// ====== CONFIGURATION ====== //
// EDIT THESE TO CUSTOMIZE THE 18 REASONS
const LOVE_REASONS = [
  'بحبك علشان طيبة قلبك وجمالك ❤️',
  'بحبك علشان ضحكتك الجميلة اللي بتنور الدنيا ❤️',
  'بحب كسوفك... حتى لو ساعات مبحبوش معايا 😅 بس بحبه جدًا فيكي ❤️',
  'بحب خوفك على زعلي واهتمامك بيا ❤️',
  'بحب إنك بتسمعي الكلام حتى لو ساعات بتتعبي قلبي... بس والله زي العسل ❤️',
  'بحب الوقت اللي بقضيه معاكي لأنه دايمًا بيعدي بسرعة ❤️',
  'بحب ذكاءك وصبرك على المشاكل ❤️',
  'بحب إنك بتحكيلي وبتفضفضيلي بكل حاجة في بالك ❤️',
  'بحب الريكوردات والفيديوهات العشوائية جدًا اللي بتبعتيهالي ❤️',
  'بحب اهتمامك بالتفاصيل الصغيرة اللي بقول مستحيل تاخدي بالك منها... ومع ذلك بتاخدي بالك منها ❤️',
  'بحب صوتك وشكلك وكل حاجة فيكي... إنتي أجمل بنت في الكون بالنسبالي ❤️',
  'بحب مكالماتك وسكوتك وكسوفك وفرحتك ورغيك ❤️',
  'بحب فترة البدايات والتلميحات... وبعدها اكتشفت جمالك الحقيقي واتعلقت بيكي أكتر ❤️',
  'بحب حبك لأهلك وأصحابك وخوفك على زعلهم ❤️',
  'بحب علاقتك بربنا ومحاولتك تكوني أحسن كل يوم... وبحس فعلًا إنك أم أولادي في المستقبل بإذن الله ❤️',
  'بحب شكلك... وحتى حاجبك اللي إنتي بتتضايقي منه والله جميل جدًا ❤️',
  'بحب الشخص الأحسن اللي طلعتيه مني بسبب حبك ❤️',
  'بحب طاقتك لما تبقي مهيبرة وفرحانة جدًا... وبتمنى تفضلي دايمًا مبسوطة ❤️',
]

interface StarData {
  id: number
  x: number
  y: number
  element: HTMLDivElement | null
}

interface NightSkyProps {
  onStarClick: (x: number, y: number) => void
  onAllStarsCollected: () => void
}

function createParticleExplosion(x: number, y: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 300
  canvas.style.position = 'fixed'
  canvas.style.left = `${x - 150}px`
  canvas.style.top = `${y - 150}px`
  canvas.style.width = '300px'
  canvas.style.height = '300px'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '100'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  const particles: {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    color: string
    size: number
  }[] = []

  const colors = ['#fde047', '#ffffff', '#f472b6', '#fbbf24', '#f43f5e', '#ffeb3b']

  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 4 + 2
    particles.push({
      x: 150,
      y: 150,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 3 + 1,
    })
  }

  let animationId: number

  function animate() {
    ctx.clearRect(0, 0, 300, 300)
    let allDead = true

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.08
      p.vx *= 0.98
      p.life -= 0.015

      if (p.life > 0) {
        allDead = false
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life * 3, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * 0.12
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1

    if (allDead) {
      cancelAnimationFrame(animationId)
      canvas.remove()
    } else {
      animationId = requestAnimationFrame(animate)
    }
  }

  animate()
}

function createPopup(text: string, x: number, y: number, container: HTMLDivElement) {
  const popup = document.createElement('div')
  popup.className = 'reason-popup'
  popup.innerHTML = `<p>${text}</p>`
  popup.style.left = `${Math.min(x, window.innerWidth - 300)}px`
  popup.style.top = `${Math.max(y - 100, 20)}px`
  container.appendChild(popup)

  gsap.from(popup, {
    scale: 0,
    opacity: 0,
    duration: 0.6,
    ease: 'elastic.out(1, 0.5)',
  })

  gsap.to(popup, {
    y: -60,
    duration: 4,
    ease: 'power1.out',
    onComplete: () => {
      gsap.to(popup, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => popup.remove(),
      })
    },
  })
}

export default function NightSky({ onStarClick, onAllStarsCollected }: NightSkyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<StarData[]>([])
  const collectedRef = useRef(0)
  const isCompleteRef = useRef(false)

  const handleStarClick = useCallback(
    (star: StarData, index: number) => {
      if (!star.element || isCompleteRef.current) return

      // Get click position for beam
      const rect = star.element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Notify parent (CrystalHeart) to create beam
      onStarClick(centerX, centerY)

      // Mark star as collected visually
      gsap.to(star.element, {
        scale: 1.5,
        opacity: 0,
        duration: 0.4,
        ease: 'back.in(2)',
        onComplete: () => {
          star.element?.remove()
        },
      })

      // Particle explosion at star
      createParticleExplosion(centerX, centerY)

      // Show popup with reason
      const reason = LOVE_REASONS[index]
      if (containerRef.current) {
        createPopup(reason, star.x, star.y, containerRef.current)
      }

      // Update progress
      collectedRef.current++

      // Check if all collected
      if (collectedRef.current === 18) {
        isCompleteRef.current = true
        setTimeout(() => {
          onAllStarsCollected()
        }, 2000)
      }
    },
    [onStarClick, onAllStarsCollected]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create background decorative stars
    for (let i = 0; i < 80; i++) {
      const bgStar = document.createElement('div')
      bgStar.className = 'bg-star'
      const x = Math.random() * 100
      const y = Math.random() * 100
      const duration = 2 + Math.random() * 4
      const opacity = 0.2 + Math.random() * 0.5
      const size = 1 + Math.random() * 2
      bgStar.style.left = `${x}%`
      bgStar.style.top = `${y}%`
      bgStar.style.setProperty('--duration', `${duration}s`)
      bgStar.style.setProperty('--opacity', `${opacity}`)
      bgStar.style.width = `${size}px`
      bgStar.style.height = `${size}px`
      container.appendChild(bgStar)
    }

    // Create cloud layers
    for (let i = 0; i < 3; i++) {
      const cloud = document.createElement('div')
      cloud.className = 'cloud-layer'
      cloud.style.top = `${i * 30}%`
      cloud.style.setProperty('--speed', `${40 + i * 20}s`)
      cloud.style.opacity = `${0.3 + i * 0.1}`
      container.appendChild(cloud)
    }

    // Create 18 interactive stars
    const margin = 80
    for (let i = 0; i < 18; i++) {
      const x = margin + Math.random() * (window.innerWidth - margin * 2)
      const y = margin + Math.random() * (window.innerHeight - margin * 2)

      const starEl = document.createElement('div')
      starEl.className = 'star'
      starEl.style.left = `${x}px`
      starEl.style.top = `${y}px`
      starEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="#fde047" style="width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(253,224,71,0.8))">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `

      const starData: StarData = { id: i, x, y, element: starEl }
      starsRef.current.push(starData)

      starEl.addEventListener('click', () => handleStarClick(starData, i))
      container.appendChild(starEl)
    }

    return () => {
      container.innerHTML = ''
    }
  }, [handleStarClick])

  return <div ref={containerRef} className="night-sky-container" />
}