module.exports = `

scalar DateTime
scalar JSON

type Meta {
  title: String
  slug: String
  image: String
  emailSubject: String
  description: String
  facebookTitle: String
  facebookImage: String
  facebookDescription: String
  twitterTitle: String
  twitterImage: String
  twitterDescription: String
  publishDate: DateTime
  template: String
  feed: Boolean
  kind: String
  format: Document
  dossier: Document
  credits: JSON
}

# implements FileInterface
input DocumentInput {
  # AST of /article.md
  content: JSON!
}

interface FileInterface {
  content: JSON!
  meta: Meta!
}

type Document implements FileInterface {
  id: ID!
  # AST of /article.md
  content: JSON!
  meta: Meta!
}

type DocumentPageInfo {
  endCursor: String
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
}

type DocumentConnection {
  nodes: [Document!]!
  pageInfo: DocumentPageInfo!
  totalCount: Int!
}

extend type User {
  documents(
    feed: Boolean
    first: Int
    last: Int
    before: String
    after: String
  ): DocumentConnection!
}
`
