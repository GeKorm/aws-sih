// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Template } from "aws-cdk-lib/assertions";
import { App } from "aws-cdk-lib";

import { ServerlessImageHandlerStack } from "../lib/serverless-image-stack";
import { HostedZoneStack } from "../lib/hosted-zone-stack";
import { CertificateStack } from "../lib/certificate-stack";

test("Serverless Image Handler Stack Snapshot with custom domain and different regions", () => {
  const app = new App({
    context: {
      customDomain: "cdn.example.com",
    },
  });

  const hostedZoneStack = new HostedZoneStack(app, "HostedZoneTestStack1", {
    env: {
      region: "eu-west-2",
    },
    crossRegionReferences: true,
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const certificateStack = new CertificateStack(app, "CertificateTestStack1", {
    env: {
      region: "us-east-1",
    },
    hostedZone: hostedZoneStack.hostedZone,
    crossRegionReferences: true,
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const stack = new ServerlessImageHandlerStack(app, "TestStack1", {
    env: {
      region: "eu-west-2",
    },
    certificate: certificateStack.certificate,
    hostedZone: hostedZoneStack.hostedZone,
    crossRegionReferences: true,
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const template = Template.fromStack(stack);

  const templateJson = template.toJSON();

  /**
   * iterate templateJson and for any attribute called S3Key, replace the value for that attribute with "Omitted to remove snapshot dependency on hash",
   * this is so that the snapshot can be saved and will not change because the hash has been regenerated
   */
  Object.keys(templateJson.Resources).forEach((key) => {
    if (templateJson.Resources[key].Properties?.Code?.S3Key) {
      templateJson.Resources[key].Properties.Code.S3Key = "Omitted to remove snapshot dependency on hash";
    }
    if (templateJson.Resources[key].Properties?.Content?.S3Key) {
      templateJson.Resources[key].Properties.Content.S3Key = "Omitted to remove snapshot dependency on hash";
    }
  });

  expect.assertions(1);
  expect(templateJson).toMatchSnapshot();
});

test("Serverless Image Handler Stack Snapshot with custom domain and everything in us-east-1", () => {
  const app = new App({
    context: {
      customDomain: "cdn.example.com",
    },
  });

  const hostedZoneStack = new HostedZoneStack(app, "HostedZoneTestStack2", {
    env: {
      region: "us-east-1",
    },
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const certificateStack = new CertificateStack(app, "CertificateTestStack2", {
    env: {
      region: "us-east-1",
    },
    hostedZone: hostedZoneStack.hostedZone,
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const stack = new ServerlessImageHandlerStack(app, "TestStack2", {
    env: {
      region: "us-east-1",
    },
    certificate: certificateStack.certificate,
    hostedZone: hostedZoneStack.hostedZone,
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const template = Template.fromStack(stack);

  const templateJson = template.toJSON();

  /**
   * iterate templateJson and for any attribute called S3Key, replace the value for that attribute with "Omitted to remove snapshot dependency on hash",
   * this is so that the snapshot can be saved and will not change because the hash has been regenerated
   */
  Object.keys(templateJson.Resources).forEach((key) => {
    if (templateJson.Resources[key].Properties?.Code?.S3Key) {
      templateJson.Resources[key].Properties.Code.S3Key = "Omitted to remove snapshot dependency on hash";
    }
    if (templateJson.Resources[key].Properties?.Content?.S3Key) {
      templateJson.Resources[key].Properties.Content.S3Key = "Omitted to remove snapshot dependency on hash";
    }
  });

  expect.assertions(1);
  expect(templateJson).toMatchSnapshot();
});

test("Serverless Image Handler Stack Snapshot baseline", () => {
  const app = new App();

  const stack = new ServerlessImageHandlerStack(app, "TestStack3", {
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.5",
  });

  const template = Template.fromStack(stack);

  const templateJson = template.toJSON();

  /**
   * iterate templateJson and for any attribute called S3Key, replace the value for that attribute with "Omitted to remove snapshot dependency on hash",
   * this is so that the snapshot can be saved and will not change because the hash has been regenerated
   */
  Object.keys(templateJson.Resources).forEach((key) => {
    if (templateJson.Resources[key].Properties?.Code?.S3Key) {
      templateJson.Resources[key].Properties.Code.S3Key = "Omitted to remove snapshot dependency on hash";
    }
    if (templateJson.Resources[key].Properties?.Content?.S3Key) {
      templateJson.Resources[key].Properties.Content.S3Key = "Omitted to remove snapshot dependency on hash";
    }
  });

  expect.assertions(1);
  expect(templateJson).toMatchSnapshot();
});

test("Serverless Image Handler Stack Snapshot with Origin Shield", () => {
  const app = new App({
    context: {
      originShieldEnabled: "Yes",
    },
  });

  const stack = new ServerlessImageHandlerStack(app, "TestStack4", {
    solutionId: "S0ABC",
    solutionName: "sih",
    solutionVersion: "v6.2.6",
  });

  const template = Template.fromStack(stack);

  const templateJson = template.toJSON();

  /**
   * iterate templateJson and for any attribute called S3Key, replace the value for that attribute with "Omitted to remove snapshot dependency on hash",
   * this is so that the snapshot can be saved and will not change because the hash has been regenerated
   */
  Object.keys(templateJson.Resources).forEach((key) => {
    if (templateJson.Resources[key].Properties?.Code?.S3Key) {
      templateJson.Resources[key].Properties.Code.S3Key = "Omitted to remove snapshot dependency on hash";
    }
    if (templateJson.Resources[key].Properties?.Content?.S3Key) {
      templateJson.Resources[key].Properties.Content.S3Key = "Omitted to remove snapshot dependency on hash";
    }
    if (templateJson.Resources[key].Properties?.SourceObjectKeys) {
      templateJson.Resources[key].Properties.SourceObjectKeys = [
        "Omitted to remove snapshot dependency on demo ui module hash",
      ];
    }
  });

  expect.assertions(1);
  expect(templateJson).toMatchSnapshot();
});
