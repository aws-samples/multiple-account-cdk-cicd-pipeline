# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

aws cloudformation package --profile awsmeetupgroup \
 --template-file template.yaml \
 --output-template-file serverless-output.yaml \
 --s3-bucket test-apollo-acl

aws cloudformation deploy --profile awsmeetupgroup \
 --template-file serverless-output.yaml \
 --stack-name prod \
 --capabilities CAPABILITY_IAM

aws s3 mb s3://test-apollo-acl --profile awsmeetupgroup

npm i -g typeorm
npm install -g ts-node
