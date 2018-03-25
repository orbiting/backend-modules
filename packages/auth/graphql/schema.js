module.exports = `
schema {
  query: queries
  mutation: mutations
}

type queries {
  me: User

  # check if a username is available
  # also returns true if you already own it
  # ensures signed in
  checkUsername(username: String): Boolean

  # get user by slug—a id or username
  # only returns users with a public profile
  user(slug: String): User

  # search for users
  # required role: editor
  users(search: String!, role: String!): [User]!

  # search for an unverified session by token
  unauthorizedSession(email: String!, token: SignInTokenChallenge!): Session

  # the requesting userAgent
  echo: RequestInfo!
}

type mutations {
  # signIn with an email address
  signIn(email: String!, context: String): SignInResponse!
  signOut: Boolean!

  # if userId is null, the logged in user's email is changed
  # required role to change other's email: supporter
  updateEmail(userId: ID, email: String!): User!

  # authorize a token sent by mail to convert a login request to a valid user session
  authorizeSession(email: String!, tokenChallenge: SignInTokenChallenge!, secondFactor: SignInTokenChallenge): Boolean!
  # deny a session via token challenge
  denySession(email: String!, tokenChallenge: SignInTokenChallenge!): Boolean!

  # if userId is null, this operation will be scoped to the logged in user
  # required role to clear other's session: supporter
  clearSession(sessionId: ID!, userId: ID): Boolean!

  # if userId is null, the logged in user's sessions get cleared
  # required role to clear other's session: supporter
  clearSessions(userId: ID): Boolean!

  # generate a new sharedSecret
  initSharedSecret(type: SignInTokenType = TOTP): SharedSecretResponse!
  # validate the sharedSecret for the first time via token payload
  validateSharedSecret(type: SignInTokenType = TOTP, payload: String): Boolean!
  # Activate or deactivate 2FA
  updateTwoFactorAuthentication(enabled: Boolean!): Boolean!
}
`
