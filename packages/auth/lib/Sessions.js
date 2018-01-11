const { NoSessionError, QueryEmailMismatchError, DestroySessionError } = require('./errors')
const hashSessionId = require('./hashSessionId')

const destroySession = async (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy(error => {
      if (error) {
        return reject(new DestroySessionError({ req, error }))
      }
      return resolve()
    })
  })
}

const sessionByToken = async ({ pgdb, token, email: emailFromQuery, ...meta }) => {
  const Sessions = pgdb.public.sessions
  const session = await Sessions.findOne({
    'sess @>': { token }
  })
  if (!session) {
    throw new NoSessionError({ token, emailFromQuery, ...meta })
  }

  const { email } = session.sess
  if (emailFromQuery && email !== emailFromQuery) { // emailFromQuery might be null for old links
    throw new QueryEmailMismatchError({ token, email, emailFromQuery })
  }

  return session
}

const findAllUserSessions = async ({ pgdb, userId }) => {
  const Sessions = pgdb.public.sessions
  const sessions = await Sessions.find({
    'sess @>': { passport: { user: userId } }
  })
  return sessions || []
}

const clearAllUserSessions = async ({ pgdb, store, userId }) => {
  const transaction = await pgdb.transactionBegin()
  try {
    const sessions = await findAllUserSessions({ pgdb: transaction, userId })
    await Promise.all(sessions.map(session =>
      transaction.public.sessions.delete({ sid: session.sid })
    ))
    await transaction.transactionCommit()
    return (sessions.length > 0)
  } catch (e) {
    await transaction.transactionRollback()
    throw e
  }
}

const clearUserSession = async ({ pgdb, userId, sessionId }) => {
  const transaction = await pgdb.transactionBegin()
  try {
    const existingUser = await transaction.public.users.findOne({ id: userId })
    const sessions = await findAllUserSessions({ pgdb: transaction, userId })
    const matchingSessions = sessions
      .filter(async (session) => (
        (await hashSessionId(session.sid, existingUser.email)) === sessionId)
      )
    const session = matchingSessions && matchingSessions[0]
    if (session) await transaction.public.sessions.delete({ sid: session.sid })
    await transaction.transactionCommit()
    return !!session
  } catch (e) {
    await transaction.transactionRollback()
    throw e
  }
}

const authorizeSession = async ({ pgdb, token, emailFromQuery, signInHooks = [] }) => {
  const Users = pgdb.public.users
  const Sessions = pgdb.public.sessions

  const session = await sessionByToken({ pgdb, token, email: emailFromQuery })
  const { email } = session.sess

  // verify and/or create the user
  const existingUser = await Users.findOne({
    email
  })
  const user = existingUser ||
    await Users.insertAndGet({
      email,
      verified: true
    })
  if (!user.verified) {
    await Users.updateOne({
      id: user.id
    }, {
      verified: true
    })
  }

  // log in the session and delete token
  await Sessions.updateOne({
    sid: session.sid
  }, {
    sess: {
      ...session.sess,
      token: null,
      passport: {
        user: user.id
      }
    }
  })

  // call signIn hooks
  await Promise.all(
    signInHooks.map(hook =>
      hook(user.id, !existingUser, pgdb)
    )
  )

  return user
}

module.exports = {
  sessionByToken,
  findAllUserSessions,
  authorizeSession,
  clearUserSession,
  clearAllUserSessions,
  destroySession
}