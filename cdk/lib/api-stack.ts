import { Stack, StackProps, Construct } from "@aws-cdk/core";
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Function, Runtime, Code } from "@aws-cdk/aws-lambda";
import { Vpc, SecurityGroup, SubnetType } from "@aws-cdk/aws-ec2";
import { Secret } from "@aws-cdk/aws-secretsmanager";

export interface LambdaStackProps extends StackProps {
  vpc: Vpc;
  inboundDbAccessSecurityGroup: string;
  rdsEndpoint: string;
  rdsDbUser: string;
  rdsDbName: string;
  rdsPort: number;
}

export class GraphqlApiStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const secret = Secret.fromSecretAttributes(this, "rdsPassword", {
      secretArn: `arn:aws:secretsmanager:${process.env.CDK_DEFAULT_REGION}:807230335956:secret:rdsPassword-3Eir69`,
    });

    const handler = new Function(this, "graphql", {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset("api"),
      handler: "build/src/graphql.handler",
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.ISOLATED,
      },
      securityGroup: SecurityGroup.fromSecurityGroupId(
        this,
        "inboundDbAccessSecurityGroup" + "rdsLambda",
        props.inboundDbAccessSecurityGroup
      ),
      environment: {
        DB_USERNAME: props.rdsDbUser,
        DB_ENDPOINT: props.rdsEndpoint,
        DB_NAME: props.rdsDbName,
        DB_PORT: props.rdsPort.toString(),
        DB_PASSWORD: secret.secretValue.toString(),
      },
    });

    const api = new LambdaRestApi(this, "graphql-api", {
      handler,
      proxy: false,
    });

    const graphql = api.root.addResource("graphql");
    graphql.addMethod("ANY");
  }
}
