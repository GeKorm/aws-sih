// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CommonStackProps, YesNo } from "./types";
import { CertificateResources } from "./certificate/certificate-construct";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

export class CertificateStack extends Stack {
  public certificate: Certificate;

  constructor(scope: Construct, id: string, props: CommonStackProps & { hostedZone: HostedZone }) {
    super(scope, id, props);

    const customDomain: YesNo = this.node.tryGetContext("customDomain");

    this.certificate = new CertificateResources(this, "Certificate", {
      domain: customDomain,
      hostedZone: props.hostedZone,
    }).customCertificate;
  }
}
