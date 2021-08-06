require("dotenv").config();
import { Construct, Stack, StackProps, CfnOutput } from "@aws-cdk/core";
import { StringParameter } from '@aws-cdk/aws-ssm';

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
  rdsPwdSecretArnSsmParameterName: string;
}

export class RDSStack extends Stack {
  public readonly rdsEndpointOutput: CfnOutput;
  public readonly rdsUsernameOutput: CfnOutput;
  public readonly rdsDatabaseOutput: CfnOutput;

  readonly postgresRDSInstance: DatabaseInstance;
  readonly rdsDbUser: string = process.env.TYPEORM_USERNAME || "serverless";
  readonly rdsDbName: string = process.env.TYPEORM_DATABASE || "awsmeetupgroup";
  readonly rdsPort: number = 5432;
  readonly rdsPassword: ISecret;
  
  constructor(scope: Construct, id: string, props: RDSStackProps) {
    super(scope, id, props);
    
    const secretArn = StringParameter.valueForStringParameter(this, props.rdsPwdSecretArnSsmParameterName);
    this.rdsPassword = Secret.fromSecretAttributes(this, "rdsPassword", {
      secretArn: secretArn
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
          password: this.rdsPassword.secretValue,
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

    this.rdsEndpointOutput = new CfnOutput(this, "rdsEndpoint", {
      value: this.postgresRDSInstance.instanceEndpoint.socketAddress,
      description: "Endpoint to access RDS instance"
    });
    
    this.rdsUsernameOutput = new CfnOutput(this, "rdsUsername", {
      value: this.rdsDbUser,
      description: "Root user of RDS instance"
    });

    this.rdsDatabaseOutput = new CfnOutput(this, "rdsDatabase", {
      value: this.rdsDbName,
      description: "Default database of RDS instance"
    });
  }
}
