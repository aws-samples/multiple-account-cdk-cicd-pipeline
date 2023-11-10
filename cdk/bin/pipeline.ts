#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { CdkPipelineStack } from '../lib/cdk-pipeline-stack';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';

const app = new App();
// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

new CdkPipelineStack(app, 'CdkPipelineStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});

app.synth();