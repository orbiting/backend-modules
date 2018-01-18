const bodyParser = require('body-parser')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { execute, subscribe } = require('graphql')
const costAnalysis = require('graphql-cost-analysis').default
const { pubsub } = require('../lib/RedisPubSub')
const cookie = require('cookie')
const cookieParser = require('cookie-parser')
const checkEnv = require('check-env')
const { transformUser } = require('@orbiting/backend-modules-auth')
const redis = require('../lib/redis')

checkEnv([
  'PUBLIC_WS_URL_BASE',
  'PUBLIC_WS_URL_PATH'
])
const {
  PUBLIC_WS_URL_BASE,
  PUBLIC_WS_URL_PATH,
  NODE_ENV,
  ENGINE_API_KEY
} = process.env

module.exports = (
  server,
  pgdb,
  httpServer,
  executableSchema,
  externalCreateGraphQLContext = a => a,
) => {
  const createContext = ({user, ...additional} = {}) => externalCreateGraphQLContext({
    ...additional,
    pgdb,
    user,
    pubsub,
    redis
  })

  const subscriptionServer = SubscriptionServer.create(
    {
      schema: executableSchema,
      execute,
      subscribe,
      onConnect: async (connectionParams, websocket) => {
        const cookiesRaw = (NODE_ENV === 'testing')
          ? connectionParams.cookies
          : websocket.upgradeReq.headers.cookie
        if (!cookiesRaw) {
          return createContext()
        }
        const cookies = cookie.parse(cookiesRaw)
        const sid = cookieParser.signedCookie(
          cookies['connect.sid'],
          process.env.SESSION_SECRET
        )
        const session = sid && await pgdb.public.sessions.findOne({ sid })
        if (session) {
          const user = await pgdb.public.users.findOne({id: session.sess.passport.user})
          return createContext({
            user: transformUser(user)
          })
        }
        return createContext()
      },
      keepAlive: 40000
    },
    {
      server: httpServer,
      path: PUBLIC_WS_URL_PATH
    }
  )

  const graphqlMiddleware = graphqlExpress((req) => {
    const costAnalyzer = costAnalysis({
      maximumCost: 100000,
      defaultCost: 10,
      onComplete(cost, ...rest) {
        if (req && req.body) {
          console.log(`cost-analysis / ${req.body.operationName}: ${cost}`)
        }
      }
    });
    return {
      debug: false,
      formatError: (error) => {
        console.error('error in graphql', error)
        return error
      },
      schema: executableSchema,
      validationRules: [ costAnalyzer ],
      context: createContext({
        user: req.user,
        req
      }),
      tracing: !!ENGINE_API_KEY
    }
  })

  server.use('/graphql',
    bodyParser.json({limit: '64mb'}),
    graphqlMiddleware
  )
  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: PUBLIC_WS_URL_BASE + PUBLIC_WS_URL_PATH
  }))

  return subscriptionServer
}
