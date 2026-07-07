import { useState, useCallback, useRef } from 'react'
import NightSky from './sections/NightSky'
import { CrystalHeart, type CrystalHeartHandle } from './sections/CrystalHeart'
import DateScene from './sections/DateScene'
import GardenScene from './sections/GardenScene'
import './App.css'

type Scene = 'night' | 'transition' | 'date' | 'garden'

function App() {
  const [scene, setScene] = useState<Scene>('night')
  const crystalHeartRef = useRef<CrystalHeartHandle>(null)

  const handleStarClick = useCallback((x: number, y: number) => {
    crystalHeartRef.current?.triggerBeam(x, y)
  }, [])

  const handleAllCollected = useCallback(() => {
    crystalHeartRef.current?.startCinematicSequence()
  }, [])

  const handleCrystalComplete = useCallback(() => {
    setScene('date')
  }, [])

  const handleSwipeUp = useCallback(() => {
    setScene('garden')
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '200vh' }}>
      {/* Scene 1: Night Sky (always rendered, z-index 1) */}
      <NightSky
        onStarClick={handleStarClick}
        onAllStarsCollected={handleAllCollected}
      />

      {/* Scene 2+3: Date Scene (rendered during transition + date, z-index 2) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 2,
          opacity: scene === 'date' || scene === 'garden' ? 1 : 0,
          transition: 'opacity 4s ease',
          pointerEvents: scene === 'date' || scene === 'garden' ? 'auto' : 'none',
        }}
      >
        <DateScene
          isActive={scene === 'date' || scene === 'garden'}
          onSwipeUp={handleSwipeUp}
        />
      </div>

      {/* Scene 4: Garden (scrollable, below date) */}
      {scene === 'garden' && (
        <div style={{ position: 'relative', zIndex: 5 }}>
          <GardenScene isActive={scene === 'garden'} />
        </div>
      )}

      {/* Crystal Heart System (overlay, z-index 50-100) */}
      <CrystalHeart
        ref={crystalHeartRef}
        onComplete={handleCrystalComplete}
      />
    </div>
  )
}

export default App