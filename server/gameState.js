/**
 * Game State Manager for Gjett bildet Game Show Mode
 */

export const GAME_STATES = {
  LOBBY: 'LOBBY',
  PLAYING: 'PLAYING',
  ANSWERING: 'ANSWERING',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER'
}

const POINTS_BY_STEP = [100, 80, 60, 50, 40, 30, 20]
const WRONG_ANSWER_PENALTY = 50 
const PENALTY_DURATION = 3000   // 3 sekunder delay

export class GameStateManager {
  constructor() {
    this.rooms = new Map()
    this.socketToRoom = new Map()
    this.socketToPlayer = new Map()
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    if (this.rooms.has(code)) return this.generateRoomCode()
    return code
  }

  createRoom(hostSocketId, category, mode) {
    const roomCode = this.generateRoomCode()
    const room = {
      code: roomCode,
      hostSocketId,
      category,
      mode,
      gameState: GAME_STATES.LOBBY,
      players: [],
      buzzerQueue: [],
      buzzerLocked: false,
      selectedPlayer: null,
      currentImageIndex: 0,
      currentRevealStep: 0,
      totalImages: 0,
      playerCooldowns: new Map(), 
      eliminatedPlayers: new Set(), // Holder styr på hvem som er ute av NÅVÆRENDE bilde
      createdAt: Date.now()
    }
    this.rooms.set(roomCode, room)
    this.socketToRoom.set(hostSocketId, roomCode)
    return roomCode
  }

  getRoom(roomCode) { return this.rooms.get(roomCode) }
  roomExists(roomCode) { return this.rooms.has(roomCode) }

  addPlayer(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    const existingPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase())
    if (existingPlayer) return { error: 'Navnet er allerede i bruk' }

    const player = { id: socketId, name: playerName, score: 0, isConnected: true, joinedAt: Date.now() }
    room.players.push(player)
    this.socketToPlayer.set(socketId, { roomCode, playerId: socketId })
    return player
  }

  removePlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode)
    if (!room) return false
    room.players = room.players.filter(p => p.id !== playerId)
    room.buzzerQueue = room.buzzerQueue.filter(id => id !== playerId)
    room.playerCooldowns.delete(playerId)
    room.eliminatedPlayers.delete(playerId)
    if (room.selectedPlayer?.id === playerId) room.selectedPlayer = null
    this.socketToPlayer.delete(playerId)
    return true
  }

  startGame(roomCode, totalImages) {
    const room = this.rooms.get(roomCode)
    if (!room) return false
    room.gameState = GAME_STATES.PLAYING
    room.totalImages = totalImages
    room.currentImageIndex = 0
    room.currentRevealStep = 0
    room.buzzerQueue = []
    room.buzzerLocked = false
    room.selectedPlayer = null
    room.playerCooldowns.clear()
    room.eliminatedPlayers.clear()
    return true
  }

  updateRevealStep(roomCode, step) {
    const room = this.rooms.get(roomCode)
    if (!room) return false
    room.currentRevealStep = step
    return true
  }

  buzz(roomCode, playerId) {
    const room = this.rooms.get(roomCode)
    if (!room) return { error: 'Rom finnes ikke' }
    if (room.gameState !== GAME_STATES.PLAYING) return { error: 'Kan ikke buzze n\u00e5' }
    if (room.buzzerLocked) return { error: 'Buzzer er l\u00e5st' }

    // 1. Er du eliminert? (Svarte feil i denne runden)
    if (room.eliminatedPlayers.has(playerId)) {
        return { error: 'Du må vente til neste bilde' }
    }

    // 2. Har du straff? (Svarte feil forrige runde)
    if (room.playerCooldowns.has(playerId)) {
      const cooldownUntil = room.playerCooldowns.get(playerId)
      if (Date.now() < cooldownUntil) {
        const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000)
        return { error: `Vent ${remaining}s (straff)` }
      } else {
        room.playerCooldowns.delete(playerId) // Tiden er ute
      }
    }

    if (room.buzzerQueue.includes(playerId)) return { error: 'Du har allerede buzzet' }
    room.buzzerQueue.push(playerId)
    if (room.buzzerQueue.length >= 5) room.buzzerLocked = true
    return { success: true, queue: room.buzzerQueue, locked: room.buzzerLocked }
  }

  selectPlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    const player = room.players.find(p => p.id === playerId)
    if (!player) return null
    room.selectedPlayer = { id: player.id, name: player.name }
    room.gameState = GAME_STATES.ANSWERING
    return room.selectedPlayer
  }

  processAnswer(roomCode, playerId, isCorrect) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    const player = room.players.find(p => p.id === playerId)
    if (!player) return null

    if (isCorrect) {
      const points = POINTS_BY_STEP[room.currentRevealStep] || 20
      player.score += points
      room.gameState = GAME_STATES.ROUND_END
      room.buzzerQueue = []
      room.buzzerLocked = false
      room.selectedPlayer = null
      
      // Riktig svar vasker tavla
      room.playerCooldowns.clear()
      room.eliminatedPlayers.clear()
      
      return { correct: true, points, playerScore: player.score, players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })) }
    } else {
      // FEIL SVAR
      if (player.score > 0) {
          // Trekker 50 poeng, men stopper på 0 (ingen negative tall)
          player.score = Math.max(0, player.score - WRONG_ANSWER_PENALTY)
      }
      
      // BLOKKER SPILLER RESTEN AV DETTE BILDET
      room.eliminatedPlayers.add(playerId)

      room.buzzerQueue = room.buzzerQueue.filter(id => id !== playerId)
      room.selectedPlayer = null
      room.gameState = GAME_STATES.PLAYING
      if (room.buzzerQueue.length < 5) room.buzzerLocked = false
      
      return { 
          correct: false, 
          queue: room.buzzerQueue, 
          locked: room.buzzerLocked, 
          eliminated: true, // Send beskjed om at de er blokkert nå
          players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })) 
      }
    }
  }

  nextImage(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    
    room.currentImageIndex++
    room.currentRevealStep = 0
    room.buzzerQueue = []
    room.buzzerLocked = false
    room.selectedPlayer = null
    room.playerCooldowns.clear()

    // --- OVERFØR ELIMINERTE TIL STRAFF ---
    const penalizedPlayers = []
    room.eliminatedPlayers.forEach(playerId => {
        // De som svarte feil sist, får 3 sekunder straff nå
        room.playerCooldowns.set(playerId, Date.now() + PENALTY_DURATION)
        penalizedPlayers.push(playerId)
    })
    // Tøm listen over eliminerte (de er nå "straffet" i stedet)
    room.eliminatedPlayers.clear()

    if (room.currentImageIndex >= room.totalImages) {
      room.gameState = GAME_STATES.GAME_OVER
      return { gameOver: true, finalScores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })).sort((a, b) => b.score - a.score) }
    }
    
    room.gameState = GAME_STATES.PLAYING
    
    return { 
        gameOver: false, 
        imageIndex: room.currentImageIndex, 
        totalImages: room.totalImages,
        penalizedPlayers, // Liste over spillere som skal få beskjed om nedtelling
        penaltyDuration: PENALTY_DURATION
    }
  }

  clearBuzzerQueue(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return false
    room.buzzerQueue = []
    room.buzzerLocked = false
    room.selectedPlayer = null
    room.gameState = GAME_STATES.PLAYING
    return true
  }

  endGame(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    room.gameState = GAME_STATES.GAME_OVER
    return room.players.map(p => ({ id: p.id, name: p.name, score: p.score })).sort((a, b) => b.score - a.score)
  }

  handleDisconnect(socketId) {
    // ... (Behold standard logikk)
    const roomCode = this.socketToRoom.get(socketId)
    if (roomCode) {
      const room = this.rooms.get(roomCode)
      if (room) {
        for (const player of room.players) this.socketToPlayer.delete(player.id)
        this.rooms.delete(roomCode)
        this.socketToRoom.delete(socketId)
        return { type: 'host', roomCode, players: room.players.map(p => p.id) }
      }
    }
    const playerInfo = this.socketToPlayer.get(socketId)
    if (playerInfo) {
      const room = this.rooms.get(playerInfo.roomCode)
      if (room) {
        const player = room.players.find(p => p.id === socketId)
        if (player) {
          player.isConnected = false
          room.buzzerQueue = room.buzzerQueue.filter(id => id !== socketId)
          if (room.selectedPlayer?.id === socketId) {
            room.selectedPlayer = null
            room.gameState = GAME_STATES.PLAYING
          }
        }
        this.socketToPlayer.delete(socketId)
        return { type: 'player', roomCode: playerInfo.roomCode, playerId: socketId, hostSocketId: room.hostSocketId, players: room.players }
      }
    }
    return null
  }

  getFullState(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null
    return {
      roomCode: room.code,
      gameState: room.gameState,
      players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, isConnected: p.isConnected })),
      buzzerQueue: room.buzzerQueue,
      buzzerLocked: room.buzzerLocked,
      selectedPlayer: room.selectedPlayer,
      currentImageIndex: room.currentImageIndex,
      currentRevealStep: room.currentRevealStep,
      totalImages: room.totalImages
    }
  }

  cleanupOldRooms(maxAgeMs = 3600000) {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > maxAgeMs) {
        for (const player of room.players) this.socketToPlayer.delete(player.id)
        this.socketToRoom.delete(room.hostSocketId)
        this.rooms.delete(code)
      }
    }
  }
}