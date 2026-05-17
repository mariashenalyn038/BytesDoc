import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import documentsRouter from './routes/documents'
import administrationsRouter from './routes/administrations'
import categoriesRouter from './routes/categories'
import eventsRouter from './routes/events'
import usersRouter from './routes/users'
import activityLogsRouter from './routes/activitylogs'
import dashboardRouter from './routes/dashboard'
import archiveRouter from './routes/archive'
import { errorHandler } from './middleware/error'

const app = express()
const PORT = Number(process.env.PORT) || 4000
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

app.use(helmet())
app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '10mb' }))

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/documents', archiveRouter)   // archive sub-routes on /api/documents/:id/archive
app.use('/api/administrations', administrationsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/events', eventsRouter)
app.use('/api/users', usersRouter)
app.use('/api/activity-logs', activityLogsRouter)
app.use('/api/dashboard', dashboardRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`backend running on http://localhost:${PORT}`)
})