import { ApolloServer, gql } from 'apollo-server-lambda';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

import { schema } from './schema';
import { resolvers } from './resolvers';
import { db } from './db-connection';

const createConnection = async () => {
  const testConnection = await db();
  console.log('TESTING CONNECTION:', testConnection);
};

createConnection();

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

export const handler = server.createHandler();
