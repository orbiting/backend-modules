var RateLimit = require('express-rate-limit')

module.exports = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  delayMs: 100,
  onLimitReached (req, res, options) {
    console.log(`rate limit / reached for ${req.user && req.user.id} ${req.ip} ${JSON.stringify(req.rateLimit)}`)
  },
  keyGenerator (req) {
    return (req.user ? `${req.user.id}-${req.ip}` : req.ip)
  }
})
