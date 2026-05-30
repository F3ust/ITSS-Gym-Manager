import express from 'express'
import cors from 'cors'
import routes from './routes/index'
import { errorHandler } from './middlewares/error-handler'

export const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', routes)
app.use(errorHandler)
