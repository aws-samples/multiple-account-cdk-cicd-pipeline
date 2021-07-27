import { gql } from 'apollo-server-lambda';

// Construct a schema, using GraphQL schema language
export const schema = gql`
  type Query {
    hello: String
  }
`;
