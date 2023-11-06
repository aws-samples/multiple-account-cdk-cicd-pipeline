require("dotenv").config();
import { Construct } from "constructs";
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Vpc, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";


export interface LambdaStackProps extends StackProps {
  vpc: Vpc;
  inboundDbAccessSecurityGroup: string;
  rdsEndpoint: string;
  rdsDbUser: string;
  rdsDbName: string;
  rdsPort: number;
  rdsPasswordSecretName: string;
}

export class GraphqlApiStack extends Stack {
  public readonly apiPathOutput: CfnOutput;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const dbPwdSecret = Secret.fromSecretNameV2(this, "dbPwdSecret", props.rdsPasswordSecretName);
    const handler = new Function(this, "graphql", {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromAsset("api"),
      handler: "build/src/graphql.handler",
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [SecurityGroup.fromSecurityGroupId(
        this,
        "inboundDbAccessSecurityGroup" + "rdsLambda",
        props.inboundDbAccessSecurityGroup
      )],
      environment: {
        TYPEORM_USERNAME: props.rdsDbUser,
        TYPEORM_HOST: props.rdsEndpoint,
        TYPEORM_DATABASE: props.rdsDbName,
        TYPEORM_PORT: props.rdsPort.toString(),
        TYPEORM_PASSWORD: dbPwdSecret.secretValue.toString(),
        TYPEORM_SYNCHRONIZE: "true",
        TYPEORM_LOGGING: "true",
        TYPEORM_ENTITIES: "./build/src/entity/*.entity.js",
      },
    });

    const api = new LambdaRestApi(this, "graphql-api", {
      handler,
      proxy: false,
    });

    const graphql = api.root.addResource("graphql");
    graphql.addMethod("ANY");

    this.apiPathOutput = new CfnOutput(this, "apiPath", {
      value: api.root.path,
      description: "Path of the API"
    });
  }
}
