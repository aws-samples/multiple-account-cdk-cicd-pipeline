import { CfnOutput, Construct, Stage, StageProps, Stack, StackProps, Aws } from "@aws-cdk/core";
import { CodePipeline, CodePipelineSource, ShellStep, Wave } from "@aws-cdk/pipelines";
import { PolicyDocument, PolicyStatement, Effect, Policy } from "@aws-cdk/aws-iam";
import { GraphqlApiStack } from "./api-stack";
import { VpcStack } from "./vpc-stack";
import { RDSStack } from "./rds-stack";
import { IDatabaseInstance } from "@aws-cdk/aws-rds";
import { ISecret } from "@aws-cdk/aws-secretsmanager";

export interface AppStageProps extends StageProps {
  primaryRdsInstance?: IDatabaseInstance,
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
      primaryRdsInstance: props?.primaryRdsInstance
    });

    this.apiStack = new GraphqlApiStack(this, "APIStack", {
      vpc: vpcStack.vpc,
      inboundDbAccessSecurityGroup:
        this.rdsStack.postgresRDSInstance.connections.securityGroups[0].securityGroupId,
      rdsEndpoint: this.rdsStack.postgresRDSInstance.dbInstanceEndpointAddress,
      rdsDbUser: this.rdsStack.rdsDbUser,
      rdsDbName: this.rdsStack.rdsDbName,
      rdsPort: this.rdsStack.rdsPort,
      rdsPasswordSecretName: this.rdsStack.rdsDatabasePasswordSecretName.value,
    });
  }
}

export class CdkPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const githubOrg = process.env.GITHUB_ORG || "kevasync";
    const githubRepo = process.env.GITHUB_REPO || "awsmug-serverless-graphql-api";
    const githubBranch = process.env.GITHUB_REPO || "master";
    const devAccountId = process.env.DEV_ACCOUNT_ID || "";
    const stgAccountId = process.env.STG_ACCOUNT_ID || "";
    const prdAccountId = process.env.PRD_ACCOUNT_ID || "";
    const primaryRegion = process.env.PRIMARY_REGION || "us-west-2";
    const secondaryRegion = process.env.SECONDARY_REGION || "us-east-1";

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
    
    const devWave = new Wave("DEV/QA Deployments");
    const primaryRegionWave = new Wave("Primary DB Region Deployments");
    const secondaryRegionWave = new Wave("Secondary DB Region Deployments");
    
    const devStage = new AppStage(this, "dev", {
      env: { account: devAccountId, region: primaryRegion }
    });

    const qaStage = new AppStage(this, "qa", {
      env: { account: devAccountId, region: secondaryRegion }
    });

    const stgStagePrimary = new AppStage(this, "stg-primary", {
      env: { account: stgAccountId, region: primaryRegion },
      secretReplicationRegions: [secondaryRegion]
    });

    const stgStageBackup = new AppStage(this, "stg-backup", {
      env: { account: stgAccountId, region: secondaryRegion },
      primaryRdsInstance: stgStagePrimary.rdsStack.postgresRDSInstance
    });

    const prdStagePrimary = new AppStage(this, "prd-primary", {
      env: { account: prdAccountId, region: primaryRegion },
      secretReplicationRegions: [secondaryRegion]
    });

    const prdStageBackup = new AppStage(this, "prd-backup", {
      env: { account: prdAccountId, region: secondaryRegion },
      primaryRdsInstance: prdStagePrimary.rdsStack.postgresRDSInstance
    });
    
    devWave.addStage(devStage);
    devWave.addStage(qaStage);
    
    primaryRegionWave.addStage(stgStagePrimary);
    primaryRegionWave.addStage(prdStagePrimary);

    secondaryRegionWave.addStage(stgStageBackup);
    secondaryRegionWave.addStage(prdStageBackup);
  }
}