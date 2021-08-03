import { ApolloServer } from 'apollo-server';

import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';
import { db } from './db-connection';

const createConnection = async () => {
  await db();
};

const server = new ApolloServer({ typeDefs, resolvers });
const port = process.env.PORT || 8080;

server.listen({ port }).then(() => {
  createConnection();
  console.log(`Server listening on port ${port}`);
});
