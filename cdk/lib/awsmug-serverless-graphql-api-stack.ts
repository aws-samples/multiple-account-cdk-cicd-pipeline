import * as cdk from "@aws-cdk/core";
import * as core from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";

export class GraphqlService extends cdk.Stack {
  constructor(scope: core.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const handler = new lambda.Function(this, "graphql", {
      runtime: lambda.Runtime.NODEJS_14_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset("api"),
      handler: "build/src/graphql.handler",
    });

    const api = new apigateway.LambdaRestApi(this, "graphql-api", {
      handler,
      proxy: false,
    });

    const graphql = api.root.addResource("graphql");
    graphql.addMethod("ANY");
  }
}
