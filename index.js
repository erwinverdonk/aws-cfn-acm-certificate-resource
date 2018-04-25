#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2));
const pjson = require(__dirname + '/package.json');

process.env.AWS_DEFAULT_REGION = argv.region || 'us-east-1';
process.env.AWS_REGION = process.env.AWS_DEFAULT_REGION

const run = () => {
  const AwsLambdaUploadDeploy = require(
    '@erwinverdonk/aws-lambda-upload-deploy'
  ).AwsLambdaUploadDeploy;

  const functionName = (
    `AwsCfnAcmCertificateResource-${pjson.version.replace(/\./g, '-')}`
  );

  AwsLambdaUploadDeploy({
    functionName,
    sourcePath: `${__dirname}/dist`,
    version: pjson.version,
    s3: {
      bucketName: `analytics-lambdas-${process.env.AWS_REGION}`
    },
    settings: {
      runtime: 'nodejs8.10',
      memory: 128,
      timeout: 300,
      permissions: [
        {
          effect: 'Allow',
          action: ['lambda:InvokeFunction'],
          resource: [`arn:aws:lambda:*:*:function:${functionName}:*`]
        },
        {
          effect: 'Allow',
          action: [
            'acm:DeleteCertificate',
            'acm:DescribeCertificate',
            'acm:GetCertificate',
            'acm:RequestCertificate'
          ],
          resource: ['*'] // ACM does only support 'All Resources'.
        },
        {
          effect: 'Allow',
          action: ['route53:ChangeResourceRecordSets'],
          resource: ['arn:aws:route53::*:hostedzone/*']
        }
      ]
    }
  })
  .start();
}

// When a Role Arn is provided we try to assume the role before proceeding.
if(argv.roleArn){
  const AWS = require('aws-sdk');
  const assumeRole = require('aws-assume-role').assumeRole;

  assumeRole({
    roleArn: argv.roleArn // 'arn:aws:iam::922005556491:role/Administrator'
  })
  .then(_ => {
    // Setting temporary credentials as the credentials to use.
    process.env.AWS_ACCESS_KEY_ID = _.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = _.secretAccessKey;
    process.env.AWS_SESSION_TOKEN = _.sessionToken;

    AWS.config = new AWS.Config();

    // Run the deploy logic
    run();
  });
} else {
  run();
}
