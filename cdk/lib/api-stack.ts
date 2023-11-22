import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export interface ApiStackProperties extends StackProps {
  dynamoTable: TableV2
}

export class ApiStack extends Stack {
    constructor(scope: Construct, id: string, props: ApiStackProperties) {
    super(scope, id, props);

    const readLambda = new Function(this, "read-lambda", {
      runtime: Runtime.PYTHON_3_12,
      code: Code.fromAsset("api"),
      handler: "read.handler",
      environment: {
        DDB_TABLE_NAME: props.dynamoTable.tableName
      },
    });

    const createLambda = new Function(this, "create-lambda", {
      runtime: Runtime.PYTHON_3_12,
      code: Code.fromAsset("api"),
      handler: "create.handler",
      environment: {
        DDB_TABLE_NAME: props.dynamoTable.tableName
      },
    });

    props.dynamoTable.grantReadData(readLambda);
    props.dynamoTable.grantReadWriteData(createLambda);
  }
}
