/**
 * Socket.io Server for Gjett bildet Game Show Mode
 *
 * Run with: node index.js
 * Default port: 3001 (or PORT env variable)
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { GameStateManager, GAME_STATES } from './gameState.js'

const app = express()
const httpServer = createServer(app)

// Configure CORS for Socket.io
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

// Add production URL if not already included
if (!CORS_ORIGINS.includes('https://gjett-bildet.ak-kreativ.no')) {
  CORS_ORIGINS.push('https://gjett-bildet.ak-kreativ.no')
}

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST']
  }
})

const gameManager = new GameStateManager()

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: gameManager.rooms.size })
})

// Clean up old rooms every 30 minutes
setInterval(() => {
  gameManager.cleanupOldRooms()
}, 30 * 60 * 1000)

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // ==================== HOST EVENTS ====================

  socket.on('host:create-room', ({ category, mode }, callback) => {
    try {
      const roomCode = gameManager.createRoom(socket.id, category, mode)
      socket.join(roomCode)

      console.log(`Room created: ${roomCode} by host ${socket.id}`)

      if (callback) {
        callback({ success: true, roomCode })
      }
      socket.emit('room:created', { roomCode, hostId: socket.id })
    } catch (error) {
      console.error('Error creating room:', error)
      if (callback) {
        callback({ success: false, error: 'Kunne ikke opprette rom' })
      }
    }
  })

  socket.on('host:start-game', ({ roomCode, totalImages }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      socket.emit('room:error', { message: 'Ikke autorisert' })
      return
    }

    if (room.players.length === 0) {
      socket.emit('room:error', { message: 'Ingen spillere har blitt med enn\u00e5' })
      return
    }

    gameManager.startGame(roomCode, totalImages)

    console.log(`Game started in room ${roomCode} with ${totalImages} images`)

    io.to(roomCode).emit('game:started', {
      totalImages,
      players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    })
  })

  socket.on('host:reveal-step', ({ roomCode, step }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    gameManager.updateRevealStep(roomCode, step)

    io.to(roomCode).emit('game:reveal-updated', {
      revealStep: step
    })
  })

  socket.on('host:select-player', ({ roomCode, playerId }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    const selectedPlayer = gameManager.selectPlayer(roomCode, playerId)
    if (!selectedPlayer) return

    console.log(`Player selected to answer: ${selectedPlayer.name} in room ${roomCode}`)

    io.to(roomCode).emit('game:player-selected', selectedPlayer)
    io.to(playerId).emit('game:answer-request', { playerId })
  })

  /**
   * Host validates player's answer
   * NYTT: Håndterer nå score-oppdatering også ved feil svar (minuspoeng)
   */
  socket.on('host:validate-answer', ({ roomCode, playerId, isCorrect }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    const result = gameManager.processAnswer(roomCode, playerId, isCorrect)
    if (!result) return

    console.log(`Answer ${isCorrect ? 'correct' : 'wrong'} from ${playerId} in room ${roomCode}`)

    if (result.correct) {
      // Riktig svar
      io.to(roomCode).emit('game:answer-result', {
        playerId,
        isCorrect: true,
        points: result.points
      })
      io.to(roomCode).emit('game:scores-updated', { players: result.players })
    } else {
      // Feil svar (Sender nå også scores-updated pga minuspoeng)
      io.to(roomCode).emit('game:answer-result', {
        playerId,
        isCorrect: false
      })
      
      // Oppdater køen
      io.to(roomCode).emit('game:buzzer-queue-updated', {
        queue: result.queue,
        locked: result.locked
      })

      // NYTT: Oppdater poengsummen til alle (siden spilleren fikk minuspoeng)
      io.to(roomCode).emit('game:scores-updated', { players: result.players })
    }
  })

  socket.on('host:next-image', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    const result = gameManager.nextImage(roomCode)
    if (!result) return

    console.log(`Next image in room ${roomCode}: ${result.imageIndex + 1}/${result.totalImages}`)

    if (result.gameOver) {
      io.to(roomCode).emit('game:ended', { finalScores: result.finalScores })
    } else {
      io.to(roomCode).emit('game:image-changed', {
        imageIndex: result.imageIndex,
        totalImages: result.totalImages
      })
      io.to(roomCode).emit('game:buzzer-queue-updated', {
        queue: [],
        locked: false
      })
    }
  })

  socket.on('host:clear-buzzer', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    gameManager.clearBuzzerQueue(roomCode)

    io.to(roomCode).emit('game:buzzer-queue-updated', {
      queue: [],
      locked: false
    })
    io.to(roomCode).emit('game:player-selected', null)
  })

  socket.on('host:kick-player', ({ roomCode, playerId }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    gameManager.removePlayer(roomCode, playerId)

    console.log(`Player ${playerId} kicked from room ${roomCode}`)

    io.to(playerId).emit('room:kicked')
    io.to(roomCode).emit('room:player-left', {
      playerId,
      players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    })
  })

  socket.on('host:end-game', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    const finalScores = gameManager.endGame(roomCode)

    console.log(`Game ended in room ${roomCode}`)

    io.to(roomCode).emit('game:ended', { finalScores })
  })

  // ==================== STUDENT EVENTS ====================

  socket.on('student:join-room', ({ roomCode, playerName }, callback) => {
    const room = gameManager.getRoom(roomCode)

    if (!room) {
      const error = 'Rommet finnes ikke'
      if (callback) callback({ success: false, error })
      socket.emit('room:error', { message: error })
      return
    }

    if (room.gameState !== GAME_STATES.LOBBY) {
      const error = 'Spillet har allerede startet'
      if (callback) callback({ success: false, error })
      socket.emit('room:error', { message: error })
      return
    }

    const result = gameManager.addPlayer(roomCode, socket.id, playerName)

    if (result.error) {
      if (callback) callback({ success: false, error: result.error })
      socket.emit('room:error', { message: result.error })
      return
    }

    socket.join(roomCode)

    console.log(`Player ${playerName} (${socket.id}) joined room ${roomCode}`)

    if (callback) {
      callback({ success: true, playerId: socket.id, playerName })
    }

    io.to(roomCode).emit('room:player-joined', {
      player: { id: result.id, name: result.name, score: 0 },
      players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    })
  })

  socket.on('student:buzz', ({ roomCode }) => {
    const result = gameManager.buzz(roomCode, socket.id)

    if (result.error) {
      socket.emit('room:error', { message: result.error })
      return
    }

    const room = gameManager.getRoom(roomCode)
    const player = room?.players.find(p => p.id === socket.id)

    console.log(`Player ${player?.name || socket.id} buzzed in room ${roomCode}`)

    io.to(roomCode).emit('game:buzzer-queue-updated', {
      queue: result.queue,
      locked: result.locked
    })
  })

  socket.on('student:submit-answer', ({ roomCode, answer }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room) return

    if (room.selectedPlayer?.id !== socket.id) {
      socket.emit('room:error', { message: 'Du er ikke valgt til \u00e5 svare' })
      return
    }

    const player = room.players.find(p => p.id === socket.id)

    console.log(`Answer submitted by ${player?.name}: "${answer}" in room ${roomCode}`)

    io.to(room.hostSocketId).emit('game:answer-submitted', {
      playerId: socket.id,
      playerName: player?.name || 'Ukjent',
      answer
    })
  })

  socket.on('student:leave', ({ roomCode }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room) return

    gameManager.removePlayer(roomCode, socket.id)
    socket.leave(roomCode)

    console.log(`Player ${socket.id} left room ${roomCode}`)

    io.to(roomCode).emit('room:player-left', {
      playerId: socket.id,
      players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    })
  })

  // ==================== GENERAL EVENTS ====================

  socket.on('sync:request', ({ roomCode }) => {
    const state = gameManager.getFullState(roomCode)
    if (state) {
      socket.emit('sync:state', state)
    }
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)

    const result = gameManager.handleDisconnect(socket.id)

    if (result) {
      if (result.type === 'host') {
        console.log(`Host disconnected, closing room ${result.roomCode}`)
        io.to(result.roomCode).emit('room:closed', {
          reason: 'Verten koblet fra'
        })
      } else if (result.type === 'player') {
        console.log(`Player disconnected from room ${result.roomCode}`)
        io.to(result.roomCode).emit('room:player-left', {
          playerId: result.playerId,
          players: result.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
        })
      }
    }
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`
====================================
  Gjett bildet Game Server
====================================
  Port: ${PORT}
  CORS: ${CORS_ORIGINS.join(', ')}
====================================
  `)
})
