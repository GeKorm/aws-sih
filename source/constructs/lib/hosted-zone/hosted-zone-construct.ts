// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

interface HostedZoneResourcesProps {
  readonly domain: string;
}

/**
 * Construct that creates the certificate for the solution
 */
export class HostedZoneResources extends Construct {
  public readonly hostedZone: HostedZone;

  constructor(scope: Construct, id: string, props: HostedZoneResourcesProps) {
    super(scope, id);

    this.hostedZone = new HostedZone(this, "HostedZone", {
      zoneName: props.domain,
      comment: "Serverless Image Handler custom domain zone",
    });
  }
}
