// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { App, DefaultStackSynthesizer } from "aws-cdk-lib";
import { ServerlessImageHandlerStack } from "../lib/serverless-image-stack";
import { CertificateStack } from "../lib/certificate-stack";
import { HostedZoneStack } from "../lib/hosted-zone-stack";
import { YesNo } from "../lib/types";

// CDK and default deployment
let synthesizer = new DefaultStackSynthesizer({
  generateBootstrapVersionRule: false,
});

// Solutions pipeline deployment
const { DIST_OUTPUT_BUCKET, SOLUTION_NAME, VERSION, AWS_REGION, CDK_DEFAULT_REGION } = process.env;
if (DIST_OUTPUT_BUCKET && SOLUTION_NAME && VERSION)
  synthesizer = new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false,
    fileAssetsBucketName: `${DIST_OUTPUT_BUCKET}-\${AWS::Region}`,
    bucketPrefix: `${SOLUTION_NAME}/${VERSION}/`,
  });

const app = new App();
const customDomain: YesNo | undefined = app.node.tryGetContext("customDomain");
const solutionDisplayName = "Serverless Image Handler";
const region = AWS_REGION || CDK_DEFAULT_REGION;
const solutionVersion = VERSION ?? app.node.tryGetContext("solutionVersion");
const description = `(${app.node.tryGetContext("solutionId")}) - ${solutionDisplayName}. Version ${solutionVersion}`;

let hostedZoneStack: HostedZoneStack;
let certificateStack: CertificateStack;

const commonProps = {
  env: { region },
  synthesizer,
  description,
  solutionId: app.node.tryGetContext("solutionId"),
  solutionVersion,
  solutionName: app.node.tryGetContext("solutionName"),
};

if (customDomain) {
  hostedZoneStack = new HostedZoneStack(app, "HostedZoneStack", {
    env: { region: "us-east-1" },
    crossRegionReferences: true,
    solutionId: app.node.tryGetContext("solutionId"),
    solutionVersion: app.node.tryGetContext("solutionVersion"),
    solutionName: app.node.tryGetContext("solutionName"),
  });

  certificateStack = new CertificateStack(app, "CertificateStack", {
    env: {
      // This is the only valid region https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html#cross-region-certificates
      region: "us-east-1",
    },
    hostedZone: hostedZoneStack.hostedZone,
    crossRegionReferences: true,
    solutionId: app.node.tryGetContext("solutionId"),
    solutionVersion: app.node.tryGetContext("solutionVersion"),
    solutionName: app.node.tryGetContext("solutionName"),
  });

  // eslint-disable-next-line no-new
  new ServerlessImageHandlerStack(app, "ServerlessImageHandlerStack", {
    ...commonProps,
    certificate: certificateStack.certificate,
    hostedZone: hostedZoneStack.hostedZone,
    crossRegionReferences: true,
  });
} else {
  // eslint-disable-next-line no-new
  new ServerlessImageHandlerStack(app, "ServerlessImageHandlerStack", commonProps);
}
