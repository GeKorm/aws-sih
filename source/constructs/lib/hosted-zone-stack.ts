// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CommonStackProps, YesNo } from "./types";
import { HostedZoneResources } from "./hosted-zone/hosted-zone-construct";
import { HostedZone } from "aws-cdk-lib/aws-route53";

export class HostedZoneStack extends Stack {
  public hostedZone: HostedZone;

  constructor(scope: Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    const domain: YesNo = this.node.tryGetContext("customDomain");

    this.hostedZone = new HostedZoneResources(this, "HostedZone", { domain }).hostedZone;
  }
}
