/**
 * Game State Manager for Gjett bildet Game Show Mode
 * Manages rooms, players, buzzer queue, and scores
 */

// Room states
export const GAME_STATES = {
  LOBBY: 'LOBBY',
  PLAYING: 'PLAYING',
  ANSWERING: 'ANSWERING',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER'
}

// Points for correct answers based on reveal step
const POINTS_BY_STEP = [100, 80, 60, 50, 40, 30, 20]

export class GameStateManager {
  constructor() {
    this.rooms = new Map()
    this.socketToRoom = new Map() // Maps socket.id to roomCode
    this.socketToPlayer = new Map() // Maps socket.id to { roomCode, playerId }
  }

  /**
   * Generate a random 6-character room code
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 for clarity
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // Ensure uniqueness
    if (this.rooms.has(code)) {
      return this.generateRoomCode()
    }
    return code
  }

  /**
   * Create a new game room
   */
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
      createdAt: Date.now()
    }

    this.rooms.set(roomCode, room)
    this.socketToRoom.set(hostSocketId, roomCode)

    return roomCode
  }

  /**
   * Get room by code
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode)
  }

  /**
   * Check if room exists
   */
  roomExists(roomCode) {
    return this.rooms.has(roomCode)
  }

  /**
   * Add player to room
   */
  addPlayer(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    // Check if player name already exists
    const existingPlayer = room.players.find(p =>
      p.name.toLowerCase() === playerName.toLowerCase()
    )
    if (existingPlayer) {
      return { error: 'Navnet er allerede i bruk' }
    }

    const player = {
      id: socketId,
      name: playerName,
      score: 0,
      isConnected: true,
      joinedAt: Date.now()
    }

    room.players.push(player)
    this.socketToPlayer.set(socketId, { roomCode, playerId: socketId })

    return player
  }

  /**
   * Remove player from room
   */
  removePlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode)
    if (!room) return false

    room.players = room.players.filter(p => p.id !== playerId)

    // Remove from buzzer queue if present
    room.buzzerQueue = room.buzzerQueue.filter(id => id !== playerId)

    // Clear selected player if it was this player
    if (room.selectedPlayer?.id === playerId) {
      room.selectedPlayer = null
    }

    this.socketToPlayer.delete(playerId)

    return true
  }

  /**
   * Start the game
   */
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

    return true
  }

  /**
   * Update reveal step
   */
  updateRevealStep(roomCode, step) {
    const room = this.rooms.get(roomCode)
    if (!room) return false

    room.currentRevealStep = step
    return true
  }

  /**
   * Player buzzes in
   */
  buzz(roomCode, playerId) {
    const room = this.rooms.get(roomCode)
    if (!room) return { error: 'Rom finnes ikke' }

    if (room.gameState !== GAME_STATES.PLAYING) {
      return { error: 'Kan ikke buzze n\u00e5' }
    }

    if (room.buzzerLocked) {
      return { error: 'Buzzer er l\u00e5st' }
    }

    if (room.buzzerQueue.includes(playerId)) {
      return { error: 'Du har allerede buzzet' }
    }

    room.buzzerQueue.push(playerId)

    // Lock buzzer after 5 players
    if (room.buzzerQueue.length >= 5) {
      room.buzzerLocked = true
    }

    return { success: true, queue: room.buzzerQueue, locked: room.buzzerLocked }
  }

  /**
   * Select player to answer
   */
  selectPlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    const player = room.players.find(p => p.id === playerId)
    if (!player) return null

    room.selectedPlayer = { id: player.id, name: player.name }
    room.gameState = GAME_STATES.ANSWERING

    return room.selectedPlayer
  }

  /**
   * Process answer result
   */
  processAnswer(roomCode, playerId, isCorrect) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    const player = room.players.find(p => p.id === playerId)
    if (!player) return null

    if (isCorrect) {
      // Award points based on reveal step
      const points = POINTS_BY_STEP[room.currentRevealStep] || 20
      player.score += points

      // Move to round end
      room.gameState = GAME_STATES.ROUND_END
      room.buzzerQueue = []
      room.buzzerLocked = false
      room.selectedPlayer = null

      return {
        correct: true,
        points,
        playerScore: player.score,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      }
    } else {
      // Remove from buzzer queue and clear selection
      room.buzzerQueue = room.buzzerQueue.filter(id => id !== playerId)
      room.selectedPlayer = null
      room.gameState = GAME_STATES.PLAYING

      // Unlock buzzer if queue is now small
      if (room.buzzerQueue.length < 5) {
        room.buzzerLocked = false
      }

      return {
        correct: false,
        queue: room.buzzerQueue,
        locked: room.buzzerLocked
      }
    }
  }

  /**
   * Move to next image
   */
  nextImage(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    room.currentImageIndex++
    room.currentRevealStep = 0
    room.buzzerQueue = []
    room.buzzerLocked = false
    room.selectedPlayer = null

    if (room.currentImageIndex >= room.totalImages) {
      room.gameState = GAME_STATES.GAME_OVER
      return {
        gameOver: true,
        finalScores: room.players
          .map(p => ({ id: p.id, name: p.name, score: p.score }))
          .sort((a, b) => b.score - a.score)
      }
    }

    room.gameState = GAME_STATES.PLAYING
    return {
      gameOver: false,
      imageIndex: room.currentImageIndex,
      totalImages: room.totalImages
    }
  }

  /**
   * Clear buzzer queue (for new round or manual clear)
   */
  clearBuzzerQueue(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return false

    room.buzzerQueue = []
    room.buzzerLocked = false
    room.selectedPlayer = null
    room.gameState = GAME_STATES.PLAYING

    return true
  }

  /**
   * End the game
   */
  endGame(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    room.gameState = GAME_STATES.GAME_OVER

    return room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Handle disconnect - determine if host or player
   */
  handleDisconnect(socketId) {
    // Check if it's a host
    const roomCode = this.socketToRoom.get(socketId)
    if (roomCode) {
      // Host disconnected - end the room
      const room = this.rooms.get(roomCode)
      if (room) {
        // Clean up all player mappings
        for (const player of room.players) {
          this.socketToPlayer.delete(player.id)
        }
        this.rooms.delete(roomCode)
        this.socketToRoom.delete(socketId)
        return { type: 'host', roomCode, players: room.players.map(p => p.id) }
      }
    }

    // Check if it's a player
    const playerInfo = this.socketToPlayer.get(socketId)
    if (playerInfo) {
      const room = this.rooms.get(playerInfo.roomCode)
      if (room) {
        // Mark player as disconnected (or remove entirely)
        const player = room.players.find(p => p.id === socketId)
        if (player) {
          player.isConnected = false
          // Remove from buzzer queue
          room.buzzerQueue = room.buzzerQueue.filter(id => id !== socketId)
          if (room.selectedPlayer?.id === socketId) {
            room.selectedPlayer = null
            room.gameState = GAME_STATES.PLAYING
          }
        }
        this.socketToPlayer.delete(socketId)
        return {
          type: 'player',
          roomCode: playerInfo.roomCode,
          playerId: socketId,
          hostSocketId: room.hostSocketId,
          players: room.players
        }
      }
    }

    return null
  }

  /**
   * Get full state for sync (e.g., reconnection)
   */
  getFullState(roomCode) {
    const room = this.rooms.get(roomCode)
    if (!room) return null

    return {
      roomCode: room.code,
      gameState: room.gameState,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isConnected: p.isConnected
      })),
      buzzerQueue: room.buzzerQueue,
      buzzerLocked: room.buzzerLocked,
      selectedPlayer: room.selectedPlayer,
      currentImageIndex: room.currentImageIndex,
      currentRevealStep: room.currentRevealStep,
      totalImages: room.totalImages
    }
  }

  /**
   * Clean up old rooms (call periodically)
   */
  cleanupOldRooms(maxAgeMs = 3600000) { // 1 hour default
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > maxAgeMs) {
        // Clean up player mappings
        for (const player of room.players) {
          this.socketToPlayer.delete(player.id)
        }
        this.socketToRoom.delete(room.hostSocketId)
        this.rooms.delete(code)
      }
    }
  }
}
