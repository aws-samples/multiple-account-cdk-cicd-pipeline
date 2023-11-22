require("dotenv").config();
import { Construct } from "constructs";
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
  StorageType,
  IDatabaseInstance,
  DatabaseInstanceReadReplica
} from "aws-cdk-lib/aws-rds";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { SecurityGroup, SubnetType, Vpc, InstanceType, InstanceClass, InstanceSize } from "aws-cdk-lib/aws-ec2";

export interface RDSStackProps extends StackProps {
  vpc: Vpc;
  securityGroup: SecurityGroup, 
  stage: string,
  secretReplicationRegions: string[],
  primaryRdsInstance?: IDatabaseInstance,
}

export class RDSStack extends Stack {
  public readonly rdsEndpointOutput: CfnOutput;
  public readonly rdsUsernameOutput: CfnOutput;
  public readonly rdsDatabaseOutput: CfnOutput;
  public readonly rdsDatabasePasswordSecretName: CfnOutput;
  
  readonly postgresRDSInstance: IDatabaseInstance;
  readonly rdsDbUser: string = process.env.TYPEORM_USERNAME || "serverless";
  readonly rdsDbName: string = process.env.TYPEORM_DATABASE || "awsmeetupgroup";
  readonly rdsPort: number = 5432;
  
  
  constructor(scope: Construct, id: string, props: RDSStackProps) {
    super(scope, id, props);
    
    const dbId = `postgres-rds-instance-${props.stage}`;
    const rdsInstanceType = InstanceType.of(InstanceClass.M5, InstanceSize.LARGE);
    const pwdSecretName = "rds-password";

    if(props.primaryRdsInstance) {
      this.postgresRDSInstance = new DatabaseInstanceReadReplica(this, dbId, {
        instanceIdentifier: dbId,
        sourceDatabaseInstance: props.primaryRdsInstance,
        vpc: props.vpc,
        securityGroups: [props.securityGroup],
        vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
        multiAz: false,
        instanceType: rdsInstanceType,
        storageType: StorageType.GP2,
        port: this.rdsPort,
      });
    } else {
      const rdsPasswordSecret = new Secret(this, pwdSecretName, {
        secretName: pwdSecretName,
        replicaRegions: props.secretReplicationRegions.map(x => {return {region: x}}),
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
            version: PostgresEngineVersion.VER_15_4,
          }),
          vpc: props.vpc,
          credentials: {
            username: this.rdsDbUser,
            password: rdsPasswordSecret.secretValue,
          },
          securityGroups: [props.securityGroup],
          vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
          multiAz: false,
          allocatedStorage: 25,
          storageType: StorageType.GP2,
          databaseName: this.rdsDbName,
          port: this.rdsPort,
        }
      );
    }


    this.rdsDatabasePasswordSecretName = new CfnOutput(this, "rdsDatabasePasswordSecretName", {
      value: pwdSecretName,
      description: "Secret Manager secret name for RDS instance password"
    });

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
