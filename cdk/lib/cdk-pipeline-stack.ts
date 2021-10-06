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
  primaryRdsPassword?: ISecret
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
      primaryRdsInstance: props?.primaryRdsInstance,
      primaryRdsPassword: props?.primaryRdsPassword
    });

    this.apiStack = new GraphqlApiStack(this, "APIStack", {
      vpc: vpcStack.vpc,
      inboundDbAccessSecurityGroup:
        this.rdsStack.postgresRDSInstance.connections.securityGroups[0].securityGroupId,
      rdsEndpoint: this.rdsStack.postgresRDSInstance.dbInstanceEndpointAddress,
      rdsDbUser: this.rdsStack.rdsDbUser,
      rdsDbName: this.rdsStack.rdsDbName,
      rdsPort: this.rdsStack.rdsPort,
      rdsPassword: this.rdsStack.rdsPassword
    });
  }
}

export class CdkPipelineStack extends Stack {
  public readonly apiPath: CfnOutput;
  public readonly rdsEndpoint: CfnOutput;
  public readonly rdsUsername: CfnOutput;
  public readonly rdsDatabase: CfnOutput;
  public readonly pipelineRole: CfnOutput;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const githubOrg = process.env.GITHUB_ORG || "kevasync";
    const githubRepo = process.env.GITHUB_REPO || "awsmug-serverless-graphql-api";
    const githubBranch = process.env.GITHUB_REPO || "master";
    const crossAccountId = process.env.SECONDARY_ACCOUNT_ID || "";
    const rdsPasswordArn = process.env.RDS_PWD_ARN || "";
    // const crossAccountRole = process.env.CROSS_ACCOUNT_PIPELINE_ROLE || "OrganizationAccountAccessRole";
    

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

    
    
    // const policy = new Policy(this, "crossAccountPolicy");
    // policy.addStatements(new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: ["sts:AssumeRole"],
    //   resources: [`arn:aws:iam::${crossAccountId}:role/${crossAccountRole}`]
    // }));
    // pipeline.pipeline.role.attachInlinePolicy(policy);

    // pipeline.pipeline.addToRolePolicy(new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: ["sts:AssumeRole"],
    //   resources: [`arn:aws:iam::${crossAccountRole}:role/${crossAccountRole}`]
    // }));

    const devStage = new AppStage(this, "dev", {
      env: { account: Aws.ACCOUNT_ID, region: Aws.REGION }
    });
    pipeline.addStage(devStage);

    
    const prdWave = pipeline.addWave("prd");
    const prdStagePrimary = new AppStage(this, "prd-primary", {
      env: { account: crossAccountId, region: "us-west-2" }
    });
    const prdStageBackup = new AppStage(this, "prd-backup", {
      env: { account: crossAccountId, region: "us-east-1" },
      primaryRdsInstance: prdStagePrimary.rdsStack.postgresRDSInstance,
      primaryRdsPassword: prdStagePrimary.rdsStack.rdsPassword
    });
    
    prdWave.addStage(prdStagePrimary);
    prdWave.addStage(prdStageBackup);


    this.apiPath = devStage.apiStack.apiPathOutput;
    this.rdsEndpoint = devStage.rdsStack.rdsEndpointOutput;
    this.rdsUsername = devStage.rdsStack.rdsUsernameOutput;
    this.rdsDatabase = devStage.rdsStack.rdsDatabaseOutput;
    // this.pipelineRole = new CfnOutput(this, "pipelineRole", {
    //   value: pipeline.pipeline.role.roleName,
    //   description: "Name of IAM Role assumed by pipeline"
    // });
  }
}