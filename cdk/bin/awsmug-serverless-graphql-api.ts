#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { GraphqlService } from "../lib/awsmug-serverless-graphql-api-stack";

const app = new cdk.App();
new GraphqlService(app, "ServerlessGraphql", {});
