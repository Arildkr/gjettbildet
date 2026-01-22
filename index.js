/**
 * Socket.io Server for Gjett bildet Game Show Mode
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { GameStateManager } from './gameState.js'

const app = express()
const httpServer = createServer(app)

// CORS konfigurasjon - Tillater både localhost og din produksjons-URL
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

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

app.get('/health', (req, res) => res.json({ status: 'ok', rooms: gameManager.rooms.size }))

setInterval(() => gameManager.cleanupOldRooms(), 30 * 60 * 1000)

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // HOST EVENTS
  socket.on('host:create-room', ({ category, mode }, callback) => {
    try {
      const roomCode = gameManager.createRoom(socket.id, category, mode)
      socket.join(roomCode)
      console.log(`Room created: ${roomCode}`)
      if (callback) callback({ success: true, roomCode })
      socket.emit('room:created', { roomCode, hostId: socket.id })
    } catch (error) {
      if (callback) callback({ success: false, error: 'Kunne ikke opprette rom' })
    }
  })

  socket.on('host:start-game', ({ roomCode, totalImages }) => {
    const room = gameManager.getRoom(roomCode)
    if (!room) return
    gameManager.startGame(roomCode, totalImages)
    io.to(roomCode).emit('game:started', { totalImages, players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })) })
  })

  socket.on('host:reveal-step', ({ roomCode, step }) => {
    gameManager.updateRevealStep(roomCode, step)
    io.to(roomCode).emit('game:reveal-updated', { revealStep: step })
  })

  socket.on('host:select-player', ({ roomCode, playerId }) => {
    const selectedPlayer = gameManager.selectPlayer(roomCode, playerId)
    if (selectedPlayer) {
      io.to(roomCode).emit('game:player-selected', selectedPlayer)
      io.to(playerId).emit('game:answer-request', { playerId })
    }
  })

  socket.on('host:validate-answer', ({ roomCode, playerId, isCorrect, correctAnswerText }) => {
    const result = gameManager.processAnswer(roomCode, playerId, isCorrect)
    if (!result) return

    if (result.correct) {
      io.to(roomCode).emit('game:answer-result', { playerId, isCorrect: true, points: result.points, correctAnswerText })
      io.to(roomCode).emit('game:scores-updated', { players: result.players })
    } else {
      io.to(roomCode).emit('game:answer-result', { playerId, isCorrect: false })
      if (result.penalty) {
          // NYTT: Sender straffebeskjed til eleven
          io.to(playerId).emit('student:penalty', { duration: result.penaltyDuration })
      }
      io.to(roomCode).emit('game:buzzer-queue-updated', { queue: result.queue, locked: result.locked })
      io.to(roomCode).emit('game:scores-updated', { players: result.players })
    }
  })

  socket.on('host:next-image', ({ roomCode }) => {
    const result = gameManager.nextImage(roomCode)
    if (!result) return
    if (result.gameOver) {
      io.to(roomCode).emit('game:ended', { finalScores: result.finalScores })
    } else {
      io.to(roomCode).emit('game:image-changed', { imageIndex: result.imageIndex, totalImages: result.totalImages })
      io.to(roomCode).emit('game:buzzer-queue-updated', { queue: [], locked: false })
    }
  })

  socket.on('host:clear-buzzer', ({ roomCode }) => {
    gameManager.clearBuzzerQueue(roomCode)
    io.to(roomCode).emit('game:buzzer-queue-updated', { queue: [], locked: false })
    io.to(roomCode).emit('game:player-selected', null)
  })

  socket.on('host:kick-player', ({ roomCode, playerId }) => {
    gameManager.removePlayer(roomCode, playerId)
    io.to(playerId).emit('room:kicked')
    io.to(roomCode).emit('room:player-left', { playerId, players: gameManager.getRoom(roomCode)?.players })
  })

  socket.on('host:end-game', ({ roomCode }) => {
    const finalScores = gameManager.endGame(roomCode)
    io.to(roomCode).emit('game:ended', { finalScores })
  })

  // STUDENT EVENTS
  socket.on('student:join-room', ({ roomCode, playerName }, callback) => {
    const result = gameManager.addPlayer(roomCode, socket.id, playerName)
    if (result?.error) {
      if (callback) callback({ success: false, error: result.error })
      return
    }
    socket.join(roomCode)
    if (callback) callback({ success: true, playerId: socket.id, playerName })
    const room = gameManager.getRoom(roomCode)
    io.to(roomCode).emit('room:player-joined', { players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })) })
  })

  socket.on('student:buzz', ({ roomCode }) => {
    const result = gameManager.buzz(roomCode, socket.id)
    if (!result.error) {
      io.to(roomCode).emit('game:buzzer-queue-updated', { queue: result.queue, locked: result.locked })
    } else {
        socket.emit('room:error', { message: result.error })
    }
  })

  socket.on('student:submit-answer', ({ roomCode, answer }) => {
    const room = gameManager.getRoom(roomCode)
    if (room) {
        io.to(room.hostSocketId).emit('game:answer-submitted', { playerId: socket.id, playerName: room.players.find(p=>p.id===socket.id)?.name || 'Ukjent', answer })
    }
  })

  socket.on('student:leave', ({ roomCode }) => {
    gameManager.removePlayer(roomCode, socket.id)
    socket.leave(roomCode)
    const room = gameManager.getRoom(roomCode)
    if (room) io.to(roomCode).emit('room:player-left', { players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })) })
  })

  // GENERAL
  socket.on('sync:request', ({ roomCode }) => {
    const state = gameManager.getFullState(roomCode)
    if (state) socket.emit('sync:state', state)
  })

  socket.on('disconnect', () => {
    const result = gameManager.handleDisconnect(socket.id)
    if (result) {
      if (result.type === 'host') {
        io.to(result.roomCode).emit('room:closed', { reason: 'Verten koblet fra' })
      } else if (result.type === 'player') {
        io.to(result.roomCode).emit('room:player-left', { players: result.players.map(p => ({ id: p.id, name: p.name, score: p.score })) })
      }
    }
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
