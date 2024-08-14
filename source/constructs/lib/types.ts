// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { StackProps } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone } from "aws-cdk-lib/aws-route53";

export type YesNo = "Yes" | "No";

export interface SolutionConstructProps {
  readonly corsEnabled: string;
  readonly corsOrigin: string;
  readonly sourceBuckets: string;
  readonly deployUI: YesNo;
  readonly logRetentionPeriod: number;
  readonly autoWebP: string;
  readonly enableSignature: YesNo;
  readonly secretsManager: string;
  readonly secretsManagerKey: string;
  readonly enableDefaultFallbackImage: YesNo;
  readonly fallbackImageS3Bucket: string;
  readonly fallbackImageS3KeyBucket: string;
  readonly customDomain?: string;
}

export type CertificateConstructProps = Required<Pick<SolutionConstructProps, "customDomain">>;

export interface CommonStackProps extends StackProps {
  readonly solutionId: string;
  readonly solutionName: string;
  readonly solutionVersion: string;
}

export interface ServerlessImageHandlerStackProps extends CommonStackProps {
  readonly certificate?: Certificate;
  readonly hostedZone?: HostedZone;
}

export type CapitalizeInterface<Type> = {
  [Property in keyof Type as Capitalize<string & Property>]: Type[Property];
};
