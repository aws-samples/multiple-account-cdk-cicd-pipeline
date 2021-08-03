import { gql } from 'apollo-server-lambda';

// Construct a schema, using GraphQL schema language
export const typeDefs = gql`
  type Query {
    posts: [Post]
    post(id: Int!): Post
  }

  type Mutation {
    addPost(title: String!, text: String!): Post
    deletePost(id: Int): Boolean
  }

  type Post {
    id: Int!
    title: String!
    text: String!
  }
`;
