# AWSMEETUPGROUP Serverless Graphql API

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

export AWS_PROFILE=YOUR_PROFILE
export CDK_DEFAULT_REGION=YOUR_REGION
export CDK_DEFAULT_ACCOUNT=YOUR_ACCOUNT

aws cloudformation package \
 --template-file template.yaml \
 --output-template-file serverless-output.yaml \
 --s3-bucket test-apollo-acl

aws cloudformation deploy \
 --template-file serverless-output.yaml \
 --stack-name prod \
 --capabilities CAPABILITY_IAM

aws s3 mb s3://test-apollo-acl 

aws secretsmanager create-secret --name rdsPassword --secret-string YOUR_PASSWORD

npm i -g typeorm ts-node

### CI/CD Pipeline commands

cdk bootstrap aws://ACCOUNTID/REGION --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess  
aws secretsmanager create-secret --name github-token --description "Secret for GitHub" --secret-string "GITHUB_PERSONAL_ACCESS_TOKEN"
aws ssm put-parameter --name rds-password-secret-arn --type String --value YOUR_SECRET_ARN
export GITHUB_ORG=YOUR_GITHUB_ORG
export GITHUB_REPO=YOUR_GITHUB_REPO
export GITHUB_REPO=YOUR_GITHUB_BRANCH

*Note:* To deploy application without pipeline locally, change `cdk.json` line 2 from `"app": "npx ts-node --prefer-ts-exts cdk/bin/pipeline.ts",` to `"app": "npx ts-node --prefer-ts-exts cdk/bin/api.ts",` 

Deploy pipeline manually one time: `cdk deploy`