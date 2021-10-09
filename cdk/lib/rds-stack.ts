require("dotenv").config();
import { Construct, Stack, StackProps, CfnOutput } from "@aws-cdk/core";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
  StorageType,
  IDatabaseInstance,
  DatabaseInstanceReadReplica
} from "@aws-cdk/aws-rds";
import { ISecret, Secret } from "@aws-cdk/aws-secretsmanager";
import { SecurityGroup, SubnetType, Vpc, InstanceType, InstanceClass, InstanceSize } from "@aws-cdk/aws-ec2";

export interface RDSStackProps extends StackProps {
  vpc: Vpc;
  securityGroup: SecurityGroup, 
  stage: string,
  primaryRdsInstance?: IDatabaseInstance,
  primaryRdsPasswordName?: string
}

export class RDSStack extends Stack {
  public readonly rdsEndpointOutput: CfnOutput;
  public readonly rdsUsernameOutput: CfnOutput;
  public readonly rdsDatabaseOutput: CfnOutput;

  readonly postgresRDSInstance: IDatabaseInstance;
  readonly rdsDbUser: string = process.env.TYPEORM_USERNAME || "serverless";
  readonly rdsDbName: string = process.env.TYPEORM_DATABASE || "awsmeetupgroup";
  readonly rdsPort: number = 5432;
  readonly rdsPassword: ISecret;
  
  constructor(scope: Construct, id: string, props: RDSStackProps) {
    super(scope, id, props);
    
    const dbId = `postgres-rds-instance-${props.stage}`;
    const rdsInstanceType = InstanceType.of(InstanceClass.M5, InstanceSize.LARGE);
    const pwdId = `rds-password-${props.stage}`;

    if(props.primaryRdsInstance && props.primaryRdsPasswordName) {
      this.rdsPassword = Secret.fromSecretNameV2(this, pwdId, props.primaryRdsPasswordName);
      this.postgresRDSInstance = new DatabaseInstanceReadReplica(this, dbId, {
        instanceIdentifier: dbId,
        sourceDatabaseInstance: props.primaryRdsInstance,
        vpc: props.vpc,
        securityGroups: [props.securityGroup],
        vpcPlacement: { subnetType: SubnetType.ISOLATED },
        multiAz: false,
        instanceType: rdsInstanceType,
        storageType: StorageType.GP2,
        port: this.rdsPort,
      });
    } else {
      this.rdsPassword = new Secret(this, pwdId, {
        secretName: pwdId,
        replicaRegions: [{region: "us-east-1"}],
        generateSecretString: {
          excludeCharacters: `/@" `,
          excludePunctuation: true,
          includeSpace: false,
          excludeNumbers: false,
          excludeLowercase: false,
          excludeUppercase: false,
          passwordLength: 24
        }
      });
      this.postgresRDSInstance = new DatabaseInstance(this, dbId,
        {
          instanceIdentifier: dbId,
          instanceType: rdsInstanceType,
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
          multiAz: false,
          allocatedStorage: 25,
          storageType: StorageType.GP2,
          databaseName: this.rdsDbName,
          port: this.rdsPort,
        }
      );
    }
    

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
