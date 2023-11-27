import { Construct } from "constructs";
import { Stage, StageProps, Stack, StackProps, Aws } from "aws-cdk-lib";
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep, Wave } from "aws-cdk-lib/pipelines";
import { ApiStack } from "./api-stack";
import { DDBStack } from "./ddb-stack";
import { NagSuppressions } from "cdk-nag";

class AppStage extends Stage {
  public readonly apiStack: ApiStack;
  public readonly rdsStack: DDBStack;

  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    
    var ddbStack = new DDBStack(this, "ddb-stack", props)
    new ApiStack(this, 'api-stack', {
      dynamoTable: ddbStack.table
    })
  }
}

export class CdkPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Suppressing cdk-nag errors
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Suppressing errors originating in external packages.'
      },
      {
        id: 'AwsSolutions-KMS5',
        reason: 'Suppressing errors originating in external packages.'
      },
      {
        id: 'AwsSolutions-S1',
        reason: 'Suppressing errors originating in external packages.'
      }
    ])

    const githubOrg = process.env.GITHUB_ORG || "kevasync";
    const githubRepo = process.env.GITHUB_REPO || "multiple-account-cdk-cicd-pipeline";
    const githubBranch = process.env.GITHUB_BRANCH || "main";
    const devAccountId = process.env.DEV_ACCOUNT_ID || "undefined";
    const stgAccountId = process.env.STG_ACCOUNT_ID || "undefined";
    const prdAccountId = process.env.PRD_ACCOUNT_ID || "undefined";
    const primaryRegion = process.env.PRIMARY_REGION || "us-west-2";
    const secondaryRegion = process.env.SECONDARY_REGION || "us-east-1";

    const pipeline = new CodePipeline(this, "CDKPipeline", {
      crossAccountKeys: true,
      pipelineName: "CDKPipeline",
      synth: new ShellStep("deploy", {
        input: CodePipelineSource.gitHub(`${githubOrg}/${githubRepo}`, githubBranch),
        commands: [ 
          "npm ci",
          "npx cdk synth"
        ]
      }),
    });
    
    const devQaWave = pipeline.addWave("DEV-and-QA-Deployments");
    const dev = new AppStage(this, "dev", {
      env: { account: devAccountId, region: primaryRegion }
    });
    
    const qa = new AppStage(this, "qa", {
      env: { account: devAccountId, region: secondaryRegion }
    });
    
    const stg = new AppStage(this, "stg", {
      env: { account: stgAccountId, region: primaryRegion }
    });
    
    devQaWave.addStage(dev);
    devQaWave.addStage(qa);
    devQaWave.addStage(stg);

    const primaryRdsRegionWave = pipeline.addWave("PROD-Deployment", {
      pre: [new ManualApprovalStep("ProdManualApproval")]
    });
    const prdPrimary = new AppStage(this, "prd-primary", {
      env: { account: prdAccountId, region: primaryRegion }
    });
    primaryRdsRegionWave.addStage(prdPrimary);
  }
}