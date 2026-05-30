import 'dotenv/config'
import { app } from './app'
import { startExpiryChecker } from './services/expiry-checker'

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`API listening on ${port}`)
  startExpiryChecker()
})
