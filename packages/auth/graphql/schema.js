module.exports = `
schema {
  query: queries
  mutation: mutations
}

type queries {
  me: User

  # get user by slug—a id or username
  # only returns users with a public profile
  user(slug: String): User
  # search for users
  # required role: editor
  users(search: String!, role: String!): [User]!
}

type mutations {
  # signIn with an email address
  signIn(email: String!, context: String): SignInResponse!
  signOut: Boolean!
}
`
