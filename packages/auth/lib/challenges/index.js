const EmailTokenChallenge = require('./EmailTokenChallenge')
const TOTPChallenge = require('./TOTPChallenge')
const { newAuthError } = require('../AuthError')

const TokenTypeUnknownError = newAuthError('token-type-unknown', 'api/auth/token-type-unknown')
const SharedSecretNotSupported = newAuthError('shared-secret-not-supported', 'api/auth/shared-secret-not-supported')
const SharedSecretGenerationFailed = newAuthError('shared-secret-generation-failed', 'api/auth/shared-secret-generation-failed')
const SharedSecretValidationFailed = newAuthError('shared-secret-validation-failed', 'api/auth/shared-secret-validation-failed')
const TokenExpiredError = newAuthError('token-expired', 'api/auth/token-expired')
const QueryEmailMismatchError = newAuthError('query-email-mismatch', 'api/auth/query-email-mismatch')

const TokenTypes = {
  EMAIL_TOKEN: 'EMAIL_TOKEN',
  TOTP: 'TOTP'
}

const TokenTypeMap = {
  [TokenTypes.EMAIL_TOKEN]: EmailTokenChallenge,
  [TokenTypes.TOTP]: TOTPChallenge
}

const ChallengeHandlerProxy = ({ type, ...options }) => {
  const handler = TokenTypeMap[type]
  if (!handler) throw new TokenTypeUnknownError({ type })
  return {
    generateSharedSecret: async () => {
      if (!handler.generateSharedSecret) throw new SharedSecretNotSupported({ type, user: options.user })

      const secret = await handler.generateSharedSecret({
        type,
        ...options
      })
      if (!secret) throw new SharedSecretGenerationFailed({ type, user: options.user })

      const { pgdb, user } = options
      return pgdb.public.users.updateAndGetOne(
        {
          id: user.id
        }, {
          tempTwoFactorSecret: secret,
          twoFactorSecret: null
        }
      )
    },
    validateSharedSecret: async () => {
      if (!handler.validateSharedSecret) throw new SharedSecretNotSupported({ type, user: options.user })

      const validated = await handler.validateSharedSecret({
        type,
        ...options
      })

      if (!validated) throw new SharedSecretValidationFailed({ type, user: options.user })
      const { pgdb, user } = options
      return pgdb.public.users.updateAndGetOne(
        {
          id: user.id
        }, {
          tempTwoFactorSecret: null,
          twoFactorSecret: user.tempTwoFactorSecret
        }
      )
    },
    generateNewToken: async () => {
      const tokenData = await handler.generateNewToken({
        type,
        ...options
      })
      const { pgdb, session, email } = options
      return pgdb.public.tokens.insertAndGet({
        sessionId: session.id,
        email,
        type,
        ...tokenData
      })
    },
    startChallenge: async () => {
      return handler.startChallenge({
        type,
        ...options
      })
    },
    validateChallenge: async () => {
      const { payload, session, email: emailFromQuery } = options

      const { tokenExpiresAt, id } = session
      if (tokenExpiresAt.getTime() < (new Date()).getTime() || !id) {
        throw new TokenExpiredError({ type, payload, expiredAt: tokenExpiresAt, sessionId: session.id })
      }
      const { email } = session.sess
      if (emailFromQuery && email !== emailFromQuery) { // emailFromQuery might be null for old links
        throw new QueryEmailMismatchError({ type, payload, email, emailFromQuery })
      }

      return handler.validateChallenge({
        type,
        ...options
      })
    }
  }
}

module.exports = {
  TokenTypes,
  TokenTypeUnknownError,
  SharedSecretNotSupported,
  SharedSecretGenerationFailed,
  SharedSecretValidationFailed,
  validateChallenge: (options) => ChallengeHandlerProxy(options).validateChallenge(),
  generateNewToken: (options) => ChallengeHandlerProxy(options).generateNewToken(),
  startChallenge: (options) => ChallengeHandlerProxy(options).startChallenge(),
  generateSharedSecret: (options) => ChallengeHandlerProxy(options).generateSharedSecret(),
  validateSharedSecret: (options) => ChallengeHandlerProxy(options).validateSharedSecret()
}
