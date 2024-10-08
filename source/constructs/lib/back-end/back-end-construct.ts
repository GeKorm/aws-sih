// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from "path";
import { LambdaRestApiProps, RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  AllowedMethods,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  CfnDistribution,
  DistributionProps,
  Function,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  IOrigin,
  OriginRequestPolicy,
  OriginSslPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Certificate, CfnCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { ArnFormat, Aws, Duration, Lazy, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CloudFrontToApiGatewayToLambda } from "@aws-solutions-constructs/aws-cloudfront-apigateway-lambda";

import { addCfnSuppressRules } from "../../utils/utils";
import { QueryStringParameters } from "../../../image-handler/lib";
import { SolutionConstructProps, CapitalizeInterface, YesNo } from "../types";
import { Conditions } from "../common-resources/common-resources-construct";
import * as api from "aws-cdk-lib/aws-apigateway";
import OriginShieldProperty = CfnDistribution.OriginShieldProperty;

const queryStringParameters: (keyof QueryStringParameters)[] = [
  "signature",
  "edits",
  "headers",
  "effort",
  "outputFormat",
];

export interface BackEndProps extends SolutionConstructProps {
  readonly solutionVersion: string;
  readonly solutionId: string;
  readonly solutionName: string;
  readonly secretsManagerPolicy: Policy;
  readonly logsBucket: IBucket;
  readonly uuid: string;
  readonly cloudFrontPriceClass: string;
  readonly createSourceBucketsResource: (key?: string) => string[];
  readonly certificate?: Certificate;
  readonly hostedZone?: HostedZone;
  readonly customDomain?: string;
  readonly conditions: Conditions;
}

export class BackEnd extends Construct {
  public domainName: string;
  public aRecord?: ARecord;

  constructor(scope: Construct, id: string, props: BackEndProps) {
    super(scope, id);

    const imageHandlerLambdaFunctionRole = new Role(this, "ImageHandlerFunctionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      path: "/",
    });
    props.secretsManagerPolicy.attachToRole(imageHandlerLambdaFunctionRole);

    const imageHandlerLambdaFunctionRolePolicy = new Policy(this, "ImageHandlerFunctionPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [
            Stack.of(this).formatArn({
              service: "logs",
              resource: "log-group",
              resourceName: "/aws/lambda/*",
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            }),
          ],
        }),
        new PolicyStatement({
          actions: ["s3:GetObject"],
          resources: props.createSourceBucketsResource("/*"),
        }),
        new PolicyStatement({
          actions: ["s3:ListBucket"],
          resources: props.createSourceBucketsResource(),
        }),
        new PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [`arn:aws:s3:::${props.fallbackImageS3Bucket}/${props.fallbackImageS3KeyBucket}`],
        }),
        new PolicyStatement({
          actions: ["rekognition:DetectFaces", "rekognition:DetectModerationLabels"],
          resources: ["*"],
        }),
      ],
    });

    addCfnSuppressRules(imageHandlerLambdaFunctionRolePolicy, [
      { id: "W12", reason: "rekognition:DetectFaces requires '*' resources." },
    ]);
    imageHandlerLambdaFunctionRole.attachInlinePolicy(imageHandlerLambdaFunctionRolePolicy);

    const imageHandlerLambdaFunction = new NodejsFunction(this, "ImageHandlerLambdaFunction", {
      description: `${props.solutionName} (${props.solutionVersion}): Performs image edits and manipulations`,
      memorySize: 1024,
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(29),
      role: imageHandlerLambdaFunctionRole,
      entry: path.join(__dirname, "../../../image-handler/index.ts"),
      environment: {
        AUTO_WEBP: props.autoWebP,
        CORS_ENABLED: props.corsEnabled,
        CORS_ORIGIN: props.corsOrigin,
        SOURCE_BUCKETS: props.sourceBuckets,
        REWRITE_MATCH_PATTERN: "",
        REWRITE_SUBSTITUTION: "",
        ENABLE_SIGNATURE: props.enableSignature,
        SECRETS_MANAGER: props.secretsManager,
        SECRET_KEY: props.secretsManagerKey,
        ENABLE_DEFAULT_FALLBACK_IMAGE: props.enableDefaultFallbackImage,
        DEFAULT_FALLBACK_IMAGE_BUCKET: props.fallbackImageS3Bucket,
        DEFAULT_FALLBACK_IMAGE_KEY: props.fallbackImageS3KeyBucket,
        SOLUTION_VERSION: props.solutionVersion,
        SOLUTION_ID: props.solutionId,
      },
      bundling: {
        externalModules: ["sharp"],
        nodeModules: ["sharp"],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          beforeInstall(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [`cd ${outputDir}`, "rm -rf node_modules/sharp && npm install --arch=x64 --platform=linux sharp"];
          },
        },
      },
    });

    const imageHandlerLogGroup = new LogGroup(this, "ImageHandlerLogGroup", {
      logGroupName: `/aws/lambda/${imageHandlerLambdaFunction.functionName}`,
      retention: props.logRetentionPeriod as RetentionDays,
    });

    addCfnSuppressRules(imageHandlerLogGroup, [
      {
        id: "W84",
        reason: "CloudWatch log group is always encrypted by default.",
      },
    ]);

    const cachePolicy = new CachePolicy(this, "CachePolicy", {
      cachePolicyName: `ServerlessImageHandler-${props.uuid}`,
      defaultTtl: Duration.days(1),
      minTtl: Duration.seconds(1),
      maxTtl: Duration.days(365),
      enableAcceptEncodingGzip: false,
      headerBehavior: CacheHeaderBehavior.allowList("origin", "accept"),
      queryStringBehavior: CacheQueryStringBehavior.allowList(...queryStringParameters),
    });

    const originRequestPolicy = new OriginRequestPolicy(this, "OriginRequestPolicy", {
      originRequestPolicyName: `ServerlessImageHandler-${props.uuid}`,
      headerBehavior: CacheHeaderBehavior.allowList("origin", "accept"),
      queryStringBehavior: CacheQueryStringBehavior.allowList(...queryStringParameters),
    });

    const apiGatewayRestApi = RestApi.fromRestApiId(
      this,
      "ApiGatewayRestApi",
      Lazy.string({
        produce: () => imageHandlerCloudFrontApiGatewayLambda.apiGateway.restApiId,
      })
    );

    const origin: IOrigin = new HttpOrigin(`${apiGatewayRestApi.restApiId}.execute-api.${Aws.REGION}.amazonaws.com`, {
      originPath: "/image",
      originSslProtocols: [OriginSslPolicy.TLS_V1_1, OriginSslPolicy.TLS_V1_2],
    });

    // Inspired by https://github.com/aws-solutions/serverless-image-handler/issues/304#issuecomment-1172255508
    // Add a cloudfront Function to normalize the accept header
    const normalizeAcceptHeaderFunction = new Function(this, "NormalizeAcceptHeaderFunction", {
      runtime: FunctionRuntime.JS_2_0,
      functionName: `normalize-accept-headers-${Aws.REGION}`,
      code: FunctionCode.fromInline(`
function handler(event) {
  if (event.request.headers && event.request.headers.accept && event.request.headers.accept.value) {
    let resultingHeader = "image/jpg";
    const acceptheadervalue = event.request.headers.accept.value;
    if (acceptheadervalue.includes("image/webp")) {
      resultingHeader = "image/webp";
    }
    event.request.headers.accept = { value: resultingHeader };
  }
  return event.request;
}
`),
    });

    const cloudFrontDistributionProps: DistributionProps = {
      comment: "Image Handler Distribution for Serverless Image Handler",
      defaultBehavior: {
        origin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
        originRequestPolicy,
        cachePolicy,
        functionAssociations: [
          {
            function: normalizeAcceptHeaderFunction,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      domainNames: props.customDomain ? [props.customDomain] : undefined,
      certificate: props.certificate,
      priceClass: props.cloudFrontPriceClass as PriceClass,
      enableLogging: true,
      logBucket: props.logsBucket,
      logFilePrefix: "api-cloudfront/",
      errorResponses: [
        { httpStatus: 500, ttl: Duration.minutes(10) },
        { httpStatus: 501, ttl: Duration.minutes(10) },
        { httpStatus: 502, ttl: Duration.minutes(10) },
        { httpStatus: 503, ttl: Duration.minutes(10) },
        { httpStatus: 504, ttl: Duration.minutes(10) },
      ],
    };

    const logGroupProps = {
      retention: props.logRetentionPeriod as RetentionDays,
    };

    const apiGatewayProps: LambdaRestApiProps = {
      handler: imageHandlerLambdaFunction,
      deployOptions: {
        stageName: "image",
      },
      binaryMediaTypes: ["*/*"],
      defaultMethodOptions: {
        authorizationType: api.AuthorizationType.NONE,
      },
    };

    const imageHandlerCloudFrontApiGatewayLambda = new CloudFrontToApiGatewayToLambda(
      this,
      "ImageHandlerCloudFrontApiGatewayLambda",
      {
        existingLambdaObj: imageHandlerLambdaFunction,
        insertHttpSecurityHeaders: false,
        logGroupProps,
        cloudFrontDistributionProps,
        apiGatewayProps,
      }
    );

    addCfnSuppressRules(imageHandlerCloudFrontApiGatewayLambda.apiGateway, [
      {
        id: "W59",
        reason:
          "AWS::ApiGateway::Method AuthorizationType is set to 'NONE' because API Gateway behind CloudFront does not support AWS_IAM authentication",
      },
    ]);

    imageHandlerCloudFrontApiGatewayLambda.apiGateway.node.tryRemoveChild("Endpoint"); // we don't need the RestApi endpoint in the outputs

    if (props.customDomain) {
      (
        imageHandlerCloudFrontApiGatewayLambda.cloudFrontWebDistribution.node.defaultChild as CfnDistribution
      ).addPropertyOverride("DistributionConfig.ViewerCertificate", {
        AcmCertificateArn: (props.certificate?.node.defaultChild as CfnCertificate).ref,
        MinimumProtocolVersion: "TLSv1.2_2021",
        SslSupportMethod: "sni-only",
      });

      (
        imageHandlerCloudFrontApiGatewayLambda.cloudFrontWebDistribution.node.defaultChild as CfnDistribution
      ).addPropertyOverride("DistributionConfig.Aliases", [props.customDomain]);

      this.aRecord = new ARecord(this, "ARecord", {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        zone: props.hostedZone!,
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(imageHandlerCloudFrontApiGatewayLambda.cloudFrontWebDistribution)
        ),
        recordName: props.customDomain,
      });
    }

    this.domainName = imageHandlerCloudFrontApiGatewayLambda.cloudFrontWebDistribution.distributionDomainName;

    const originShieldEnabled = (this.node.tryGetContext("originShieldEnabled") as YesNo | undefined) === "Yes";
    const originShieldRegion: string = this.node.tryGetContext("originShieldRegion") || process.env.AWS_REGION;

    if (originShieldEnabled) {
      (
        imageHandlerCloudFrontApiGatewayLambda.cloudFrontWebDistribution.node.defaultChild as CfnDistribution
      ).addPropertyOverride("DistributionConfig.Origins.0.OriginShield", {
        Enabled: true,
        OriginShieldRegion: originShieldRegion,
      } as CapitalizeInterface<OriginShieldProperty>);
    }
  }
}
