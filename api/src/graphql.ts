import { ApolloServer, gql } from 'apollo-server-lambda';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';
import { db } from './db-connection';

const createConnection = async () => {
  await db();
};

createConnection();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ context }) => {
    context.callbackWaitsForEmptyEventLoop = false;
  },
  introspection: true,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

export const handler = server.createHandler({
  expressGetMiddlewareOptions: {
    cors: {
      origin: '*',
      credentials: true,
    },
  },
});
