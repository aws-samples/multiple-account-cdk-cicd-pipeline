import { ApolloServer } from 'apollo-server';

import { schema } from './schema';
import { resolvers } from './resolvers';

const server = new ApolloServer({ typeDefs: schema, resolvers });
const port = process.env.PORT || 8080;

server
  .listen({ port })
  .then(() => console.log(`Server listening on port ${port}`));
