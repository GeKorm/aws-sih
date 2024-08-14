// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

interface CertificateResourcesProps {
  readonly domain: string;
  readonly hostedZone: HostedZone;
}

/**
 * Construct that creates the certificate for the solution
 */
export class CertificateResources extends Construct {
  public readonly customCertificate: Certificate;

  constructor(scope: Construct, id: string, props: CertificateResourcesProps) {
    super(scope, id);

    this.customCertificate = new Certificate(this, "CustomCertificate", {
      domainName: props.domain,
      validation: CertificateValidation.fromDns(props.hostedZone),
    });
  }
}
