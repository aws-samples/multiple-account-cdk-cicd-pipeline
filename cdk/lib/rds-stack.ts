require("dotenv").config();
import { App, Stack, StackProps } from "@aws-cdk/core";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
  StorageType,
} from "@aws-cdk/aws-rds";
import { ISecret, Secret } from "@aws-cdk/aws-secretsmanager";
import { SecurityGroup, SubnetType, Vpc } from "@aws-cdk/aws-ec2";

export interface RDSStackProps extends StackProps {
  vpc: Vpc;
  securityGroup: SecurityGroup;
}

export class RDSStack extends Stack {
  readonly secret: ISecret;
  readonly postgresRDSInstance: DatabaseInstance;
  readonly rdsDbUser: string = "serverless";
  readonly rdsDbName: string = "awsmeetupgroup";
  readonly rdsPort: number = 5432;

  constructor(scope: App, id: string, props: RDSStackProps) {
    super(scope, id, props);

    this.secret = Secret.fromSecretAttributes(this, "rdsPassword", {
      secretArn: `arn:aws:secretsmanager:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:secret:rdsPassword-3Eir69`,
    });

    this.postgresRDSInstance = new DatabaseInstance(
      this,
      "postgres-rds-instance",
      {
        engine: DatabaseInstanceEngine.postgres({
          version: PostgresEngineVersion.VER_10_15,
        }),
        vpc: props.vpc,
        credentials: {
          username: this.rdsDbUser,
          password: this.secret.secretValue,
        },
        securityGroups: [props.securityGroup],
        vpcPlacement: { subnetType: SubnetType.ISOLATED },
        storageEncrypted: true,
        multiAz: false,
        allocatedStorage: 25,
        storageType: StorageType.GP2,
        databaseName: this.rdsDbName,
        port: this.rdsPort,
      }
    );
  }
}
