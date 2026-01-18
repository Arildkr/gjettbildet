import { useState, useEffect, useRef } from 'react'
import { getImages, checkAnswer } from './images'
import './App.css'

// Shuffle array
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const CATEGORIES = [
  { id: 'dyr', name: 'Dyr', icon: '🦁' },
  { id: 'steder', name: 'Kjente steder', icon: '🗼' },
  { id: 'ting', name: 'Ting', icon: '📷' },
  { id: 'blanding', name: 'Blanding', icon: '🎲' },
]

const DIFFICULTIES = [
  { id: 'easy', name: 'Lett', color: '#4CAF50' },
  { id: 'medium', name: 'Medium', color: '#FF9800' },
  { id: 'hard', name: 'Vanskelig', color: '#f44336' },
  { id: 'all', name: 'Alle nivåer', color: '#9C27B0' },
]

const MODES = [
  { id: 'mask', name: 'Avdekking', icon: '🎭', description: 'Bildet avdekkes gradvis' },
  { id: 'zoom', name: 'Zoom', icon: '🔍', description: 'Starter innzoomet, zoomer ut' },
  { id: 'pixel', name: 'Pikselert', icon: '🟦', description: 'Starter uskarpt, blir skarpere' },
]

const REVEAL_STEPS = [10, 20, 35, 50, 70, 85, 100] // Prosent synlig

function App() {
  // Game setup state
  const [gameStarted, setGameStarted] = useState(false)
  const [category, setCategory] = useState(null)
  const [difficulty, setDifficulty] = useState(null)
  const [mode, setMode] = useState(null)
  const [setupStep, setSetupStep] = useState('category') // 'category', 'difficulty', 'mode'

  // Game state
  const [images, setImages] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealStep, setRevealStep] = useState(0)
  const [guess, setGuess] = useState('')
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const inputRef = useRef(null)
  const currentImage = images[currentIndex]

  // Start game with selected options
  const startGame = (selectedMode) => {
    const diff = difficulty === 'all' ? null : difficulty
    let gameImages = getImages(category, diff)
    gameImages = shuffleArray(gameImages)

    if (gameImages.length === 0) {
      alert('Ingen bilder funnet for denne kombinasjonen!')
      return
    }

    setMode(selectedMode)
    setImages(gameImages)
    setCurrentIndex(0)
    setRevealStep(0)
    setScore(0)
    setAttempts(0)
    setGuess('')
    setShowSuccess(false)
    setGameStarted(true)
    setGameOver(false)
    setImageLoaded(false)
  }

  // Handle guess submission
  const handleGuess = (e) => {
    e.preventDefault()
    if (!guess.trim() || showSuccess) return

    setAttempts(prev => prev + 1)

    if (checkAnswer(guess, currentImage.answers)) {
      // Correct answer!
      const pointsEarned = Math.max(1, REVEAL_STEPS.length - revealStep)
      setScore(prev => prev + pointsEarned)
      setShowSuccess(true)
      setRevealStep(REVEAL_STEPS.length - 1) // Show full image
    } else {
      // Wrong answer - reveal more
      if (revealStep < REVEAL_STEPS.length - 1) {
        setRevealStep(prev => prev + 1)
      }
      setGuess('')
    }
  }

  // Next image
  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setRevealStep(0)
      setGuess('')
      setShowSuccess(false)
      setShowHint(false)
      setImageLoaded(false)
    } else {
      setGameOver(true)
    }
  }

  // Show next hint (for classroom use - teacher can reveal more without guessing)
  const showNextHint = () => {
    if (revealStep < REVEAL_STEPS.length - 1) {
      setRevealStep(prev => prev + 1)
    }
  }

  // Give up current image
  const giveUp = () => {
    setShowSuccess(true)
    setRevealStep(REVEAL_STEPS.length - 1)
    setShowHint(true)
  }

  // Reset game
  const resetGame = () => {
    setGameStarted(false)
    setCategory(null)
    setDifficulty(null)
    setMode(null)
    setSetupStep('category')
    setImages([])
    setCurrentIndex(0)
    setRevealStep(0)
    setScore(0)
    setAttempts(0)
    setGuess('')
    setShowSuccess(false)
    setShowHint(false)
    setGameOver(false)
  }

  // Focus input when image loads
  useEffect(() => {
    if (gameStarted && imageLoaded && inputRef.current && !showSuccess) {
      inputRef.current.focus()
    }
  }, [gameStarted, imageLoaded, showSuccess, currentIndex])

  // Get reveal percentage
  const revealPercent = REVEAL_STEPS[revealStep]

  // Render image with current mode effect
  const renderImage = () => {
    if (!currentImage) return null

    const baseStyle = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'all 0.5s ease',
    }

    let imageStyle = { ...baseStyle }
    let containerStyle = {
      width: '100%',
      maxWidth: '700px',
      aspectRatio: '4/3',
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative',
      background: '#1a1a2e',
    }

    if (mode === 'mask') {
      // Circular mask that grows
      const maskSize = revealPercent
      imageStyle = {
        ...baseStyle,
        clipPath: `circle(${maskSize}% at 50% 50%)`,
      }
    } else if (mode === 'zoom') {
      // Starts zoomed in, zooms out
      const scale = 1 + ((100 - revealPercent) / 100) * 4 // 5x to 1x
      imageStyle = {
        ...baseStyle,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }
    } else if (mode === 'pixel') {
      // Pixelated effect using CSS filter
      const blur = ((100 - revealPercent) / 100) * 30 // 30px to 0px blur
      imageStyle = {
        ...baseStyle,
        filter: `blur(${blur}px)`,
      }
    }

    return (
      <div style={containerStyle}>
        {!imageLoaded && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Laster bilde...</p>
          </div>
        )}
        <img
          src={currentImage.url}
          alt="Gjett bildet"
          style={{
            ...imageStyle,
            opacity: imageLoaded ? 1 : 0,
          }}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
      </div>
    )
  }

  // Category selection screen
  if (!gameStarted && setupStep === 'category') {
    return (
      <div className="container start-screen">
        <a href="https://ak-kreativ.no/aktiviteter/brainbreak/" className="back-link">
          ← Tilbake til Brainbreaks
        </a>
        <h1 className="title">Gjett Bildet</h1>
        <p className="subtitle">Klarer du å gjenkjenne bildet før det avsløres?</p>

        <div className="instructions">
          <p><strong>Slik spiller dere:</strong> Et bilde vises gradvis. Gjett hva det er! Feil svar avslører mer. Færre hint = flere poeng!</p>
        </div>

        <div className="selection">
          <p className="selection-title">Velg kategori:</p>
          <div className="option-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className="option-card"
                onClick={() => {
                  setCategory(cat.id)
                  setSetupStep('difficulty')
                }}
              >
                <span className="option-icon">{cat.icon}</span>
                <span className="option-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Difficulty selection screen
  if (!gameStarted && setupStep === 'difficulty') {
    return (
      <div className="container start-screen">
        <h1 className="title">Gjett Bildet</h1>
        <div className="selected-info">
          <span>{CATEGORIES.find(c => c.id === category)?.icon} {CATEGORIES.find(c => c.id === category)?.name}</span>
          <button className="btn-back" onClick={() => setSetupStep('category')}>← Endre</button>
        </div>

        <div className="selection">
          <p className="selection-title">Velg vanskelighetsgrad:</p>
          <div className="option-grid difficulty-grid">
            {DIFFICULTIES.map(diff => (
              <button
                key={diff.id}
                className="option-card"
                style={{ '--accent-color': diff.color }}
                onClick={() => {
                  setDifficulty(diff.id)
                  setSetupStep('mode')
                }}
              >
                <span className="option-name" style={{ color: diff.color }}>{diff.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Mode selection screen
  if (!gameStarted && setupStep === 'mode') {
    return (
      <div className="container start-screen">
        <h1 className="title">Gjett Bildet</h1>
        <div className="selected-info">
          <span>{CATEGORIES.find(c => c.id === category)?.icon} {CATEGORIES.find(c => c.id === category)?.name}</span>
          <span style={{ color: DIFFICULTIES.find(d => d.id === difficulty)?.color }}>
            {DIFFICULTIES.find(d => d.id === difficulty)?.name}
          </span>
          <button className="btn-back" onClick={() => setSetupStep('difficulty')}>← Endre</button>
        </div>

        <div className="selection">
          <p className="selection-title">Velg visningsmodus:</p>
          <div className="option-grid mode-grid">
            {MODES.map(m => (
              <button
                key={m.id}
                className="option-card mode-card"
                onClick={() => startGame(m.id)}
              >
                <span className="option-icon">{m.icon}</span>
                <span className="option-name">{m.name}</span>
                <span className="option-desc">{m.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Game over screen
  if (gameOver) {
    return (
      <div className="container game-over-screen">
        <h1 className="title">Runden er over!</h1>
        <div className="final-score">
          <span className="score-number">{score}</span>
          <span className="score-label">poeng</span>
        </div>
        <p className="stats">
          {images.length} bilder · {attempts} forsøk totalt
        </p>
        <button className="btn btn-primary" onClick={resetGame}>
          SPILL IGJEN
        </button>
      </div>
    )
  }

  // Main game screen
  return (
    <div className="container game-screen">
      <div className="header">
        <div className="header-left">
          <span className="badge">{CATEGORIES.find(c => c.id === category)?.icon} {CATEGORIES.find(c => c.id === category)?.name}</span>
          <span className="badge">{MODES.find(m => m.id === mode)?.icon} {MODES.find(m => m.id === mode)?.name}</span>
          <span className="progress">{currentIndex + 1} / {images.length}</span>
        </div>
        <div className="header-right">
          <span className="score-display">Poeng: {score}</span>
          <button className="btn btn-small btn-reset" onClick={resetGame}>Avslutt</button>
        </div>
      </div>

      <div className="game-content">
        <div className="image-container">
          {renderImage()}
          <div className="reveal-indicator">
            <div className="reveal-bar" style={{ width: `${revealPercent}%` }}></div>
          </div>
        </div>

        {showSuccess ? (
          <div className="success-message">
            <div className="success-icon">{showHint ? '😅' : '🎉'}</div>
            <p className="answer-reveal">
              {showHint ? 'Svaret var: ' : 'Riktig! Det var '}
              <strong>{currentImage.answers[0]}</strong>
            </p>
            {!showHint && <p className="points-earned">+{Math.max(1, REVEAL_STEPS.length - revealStep)} poeng!</p>}
            <button className="btn btn-primary" onClick={nextImage}>
              {currentIndex < images.length - 1 ? 'NESTE BILDE' : 'SE RESULTATER'}
            </button>
          </div>
        ) : (
          <div className="guess-section">
            {/* Classroom buttons - no typing needed */}
            <div className="classroom-controls">
              <button
                type="button"
                className="btn btn-hint"
                onClick={showNextHint}
                disabled={!imageLoaded || revealStep >= REVEAL_STEPS.length - 1}
              >
                NESTE HINT
              </button>
              <button
                type="button"
                className="btn btn-reveal"
                onClick={giveUp}
                disabled={!imageLoaded}
              >
                VIS SVARET
              </button>
            </div>

            <p className="hint-text">
              Hint: {revealStep + 1} av {REVEAL_STEPS.length} · Avdekket: {revealPercent}%
            </p>

            {/* Optional text input for those who want to type */}
            <div className="text-input-section">
              <p className="input-label">Eller skriv svaret:</p>
              <form className="guess-form" onSubmit={handleGuess}>
                <input
                  ref={inputRef}
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Skriv svaret her..."
                  className="guess-input"
                  autoComplete="off"
                  disabled={!imageLoaded}
                />
                <button type="submit" className="btn btn-primary btn-small" disabled={!imageLoaded || !guess.trim()}>
                  SJEKK SVAR
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
