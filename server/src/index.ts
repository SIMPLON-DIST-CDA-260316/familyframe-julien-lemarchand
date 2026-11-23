import { createServer } from 'node:http'
import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'
import { config } from './config.js'

const app = express()
app.use(cors({ origin: config.clientOrigin }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: config.clientOrigin } })

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`)
})

httpServer.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
