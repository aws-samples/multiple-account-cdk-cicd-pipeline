import { CfnOutput, Construct, Stage, StageProps, Stack, StackProps, Aws } from "@aws-cdk/core";
import { CodePipeline, CodePipelineSource, ShellStep } from "@aws-cdk/pipelines";
import { PolicyDocument, PolicyStatement, Effect, Policy } from "@aws-cdk/aws-iam";
import { GraphqlApiStack } from "./api-stack";
import { VpcStack } from "./vpc-stack";
import { RDSStack } from "./rds-stack";
import { IDatabaseInstance } from "@aws-cdk/aws-rds";
import { ISecret } from "@aws-cdk/aws-secretsmanager";

export interface AppStageProps extends StageProps {
  primaryRdsInstance?: IDatabaseInstance,
  primaryRdsPasswordArn?: string,
  secretReplicationRegions?: string[]
}

class AppStage extends Stage {
  public readonly apiStack: GraphqlApiStack;
  public readonly rdsStack: RDSStack;

  constructor(scope: Construct, id: string, props?: AppStageProps) {
    super(scope, id, props);
    
    const vpcStack = new VpcStack(this, "VPCStack");

    this.rdsStack = new RDSStack(this, "RDSStack", {
      vpc: vpcStack.vpc,
      securityGroup: vpcStack.ingressSecurityGroup,
      stage: id,
      secretReplicationRegions: props?.secretReplicationRegions || [],
      primaryRdsInstance: props?.primaryRdsInstance,
      primaryRdsPassword: props?.primaryRdsPasswordArn
    });

    this.apiStack = new GraphqlApiStack(this, "APIStack", {
      vpc: vpcStack.vpc,
      inboundDbAccessSecurityGroup:
        this.rdsStack.postgresRDSInstance.connections.securityGroups[0].securityGroupId,
      rdsEndpoint: this.rdsStack.postgresRDSInstance.dbInstanceEndpointAddress,
      rdsDbUser: this.rdsStack.rdsDbUser,
      rdsDbName: this.rdsStack.rdsDbName,
      rdsPort: this.rdsStack.rdsPort,
      rdsPassword: this.rdsStack.rdsDatabasePassword.value
    });
  }
}

export class CdkPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const githubOrg = process.env.GITHUB_ORG || "kevasync";
    const githubRepo = process.env.GITHUB_REPO || "awsmug-serverless-graphql-api";
    const githubBranch = process.env.GITHUB_REPO || "master";
    const crossAccountId = process.env.SECONDARY_ACCOUNT_ID || "";
  
    const pipeline = new CodePipeline(this, "Pipeline", {
      crossAccountKeys: true,
      pipelineName: "AWSMugPipeline",
      synth: new ShellStep("deploy", {
        input: CodePipelineSource.gitHub(`${githubOrg}/${githubRepo}`, githubBranch),
        commands: [ 
          "npm ci",
          "npm run build",
          "npx cdk synth"
        ]
      }),
    });

  const primaryRegion = "us-west-2";
  const secondaryRegion = "us-east-1";

  const prdStagePrimary = new AppStage(this, "prd-primary", {
    env: { account: crossAccountId, region: primaryRegion },
    secretReplicationRegions: [secondaryRegion]
  });

  const replicatedSecretArn = prdStagePrimary.rdsStack.rdsDatabasePassword.value.replace(primaryRegion, secondaryRegion);
  console.log(`secret arn: ${replicatedSecretArn}`);
  const prdStageBackup = new AppStage(this, "prd-backup", {
    env: { account: crossAccountId, region: secondaryRegion },
    primaryRdsInstance: prdStagePrimary.rdsStack.postgresRDSInstance,
    primaryRdsPasswordArn: replicatedSecretArn,
  });
  
  pipeline.addStage(prdStagePrimary);
  pipeline.addStage(prdStageBackup);

  const devStage = new AppStage(this, "dev", {
    env: { account: Aws.ACCOUNT_ID, region: primaryRegion }
  });
  pipeline.addStage(devStage);

  }
}