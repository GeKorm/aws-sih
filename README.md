**Fork of [Serverless Image Handler](https://aws.amazon.com/solutions/implementations/serverless-image-handler/)**

## Table of Contents

- [Changes in this fork](#changes-in-this-fork)
  - [Deploying or Customizing the Solution](#deploying-or-customizing-the-solution)
    - [Prerequisites](#prerequisites)
    - [1. Clone the repository](#1-clone-the-repository)
    - [2. Unit Test](#2-unit-test)
    - [3. Build and Deploy](#3-build-and-deploy)
      - [Default generated cloudfront domain](#default-generated-cloudfront-domain)
      - [Custom domains](#custom-domains)
      - [Automated deployments](#automated-deployments)
  - [Usage](#usage)
    - [Basic example](#basic-example)
      - [Other examples](#other-examples)
    - [**Query parameters**](#query-parameters)
    - [Thumbor and Rewrites](#thumbor-and-rewrites)
  - [**Configuration reference**](#configuration-reference)
    - [Cloudformation](#cloudformation)
    - [Context](#context)
    - [Environment variables](#environment-variables)
  - [License](#license)

# Changes in this fork

- **New URL scheme**. Edit with Sharp using search (query) parameters for better SEO. See [Usage](#usage)
- **Custom domain**. A certificate and hosted zone is automatically generated for your domain
- Improved cache hit ratio when `AutoWebPParameter` is enabled
- Origin Shield support for improved cache hit ratio and performance
- Disabled data collection
- Upgraded dependencies
- Scripts are only run from local dependencies (uses `npm run` instead of `npx`) for greater reliability

## Deploying or Customizing the Solution

### Prerequisites

- [AWS Command Line Interface](https://aws.amazon.com/cli/)
- Node.js 20.x or later

### 1. Clone the repository

```bash
git clone https://github.com/GeKorm/aws-sih.git
cd aws-sih
export MAIN_DIRECTORY=$PWD
```

### 2. Unit Test

After making changes, run unit tests to make sure added customization passes the tests:

```bash
cd $MAIN_DIRECTORY/deployment
chmod +x run-unit-tests.sh && ./run-unit-tests.sh
```

### 3. Build and Deploy

Pick either

- [Default generated cloudfront domain](#default-generated-cloudfront-domain)
- [Custom domains](#custom-domains)

#### Default generated cloudfront domain

```bash
cd $MAIN_DIRECTORY/source/constructs
npm run clean:install
overrideWarningsEnabled=false npm run cdk -- bootstrap --profile <PROFILE_NAME>
overrideWarningsEnabled=false npm run cdk -- deploy\
 --parameters DeployDemoUIParameter=No\
  --parameters SourceBucketsParameter=<MY_BUCKET>\
   --profile <PROFILE_NAME>
```

#### Custom domains

```bash
cd $MAIN_DIRECTORY/source/constructs
npm run clean:install
overrideWarningsEnabled=false npm run cdk -- bootstrap --profile <PROFILE_NAME>
overrideWarningsEnabled=false npm run cdk -- deploy --all\
 --parameters ServerlessImageHandlerStack:DeployDemoUIParameter=No\
  --parameters ServerlessImageHandlerStack:SourceBucketsParameter=<MY_BUCKET>\
   --context customDomain=<MY_DOMAIN>\
    --profile <PROFILE_NAME>
```

The first deployment with a custom domain requires verifying ownership, if not already verified. Until verified, the **deployment will seem stuck** at the `Certificate create_in_progress` step. Please see `https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html` for instructions. The solution will have created a Hosted zone for you custom domain, which you can view in the AWS Route 53 dashboard.

_Note:_

- **MY_BUCKET**: name of an existing bucket or buckets in your account
- **PROFILE_NAME**: name of an AWS CLI profile that has appropriate credentials for deploying in your preferred region
- **MY_DOMAIN**: full domain to use as a Cloudfront alias, eg `--context customDomain=x.example.com`

See all parameters: [Parameters reference](#parameters-reference)

#### Automated deployments

For automated deployments with GitHub actions, see `.github/workflows/pipeline-workflow.yml`.

1. Fork this repo
2. Bootstrap locally if not already done
3. Change `if: github.repository_owner == 'GeKorm'` to your user or organization name
4. Add the following variables and secrets:
   - Secret **DISPATCHER_ROLE_ARN** (for [`role-to-assume` in aws credentials action](https://github.com/aws-actions/configure-aws-credentials))
   - Secret **SOURCE_BUCKETS** (for [`SourceBucketsParameter`](#cloudformation))
   - _[Optional]_ Variable **DEMO_UI** (for [`DeployDemoUIParameter`](#cloudformation))
   - _[Optional]_ Secret **CUSTOM_DOMAIN** (for [`customDomain`](#context))
   - _[Optional]_ Secret **AWS_REGION** ([environment variable](#environment-variables))

For further customization, such as using Origin Shield, please modify the pipeline workflow command.

## Usage

The new URL scheme is `https://<domain>/<s3-url-or-path-to-image>?edits=<edits>`. The bucket and key are part of the URL unencoded. All other parameters like moved to the query string portion of the URL.

### Basic example

```typescript
// How to use edits https://docs.aws.amazon.com/solutions/latest/serverless-image-handler/create-and-use-image-requests.html#dynamically-resize-photos
const edits = {};

// Stringify and encode URI
// For s3 bucket "bucket" and image key "/folder/image.jpg":
const url = `https://example.cloudfront.net/bucket/folder/image.jpg?edits=${encodeURIComponent(
  JSON.stringify(edits),
)}`;
```

#### Other examples

The image's full S3 URL can be used. This is a non-exhaustive list of accepted formats

- https://example.cloudfront.net/bucket/folder/image.jpg?edits=
- https://example.cloudfront.net/s3.us-east-1.amazonaws.com/bucket/test.jpg?edits=
- https://example.cloudfront.net/https://s3.amazonaws.com/bucket/test?edits= (extension is optional)
- https://example.cloudfront.net/s3.amazonaws.com/bucket/test.jpg?edits=
- https://example.cloudfront.net/https://s3-us-east-1.amazonaws.com/source-bucket/test.jpg?edits=

Please open an issue if your preferred S3 URL format isn't supported.

### Query parameters

| Key            | Value                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `signature`    | `string`                                                                                          |
| `effort`       | `number` (Default: `4`, see [Sharp `options.effort`](https://sharp.pixelplumbing.com/api-output)) |
| `outputFormat` | [`ImageFormatTypes`](source/image-handler/lib/enums.ts#L19)                                       |
| `edits`        | `encodeURIComponent(JSON.stringify(edits))`                                                       |
| `headers`      | `encodeURIComponent(JSON.stringify(headers))`                                                     |

As an alternative to `encodeURIComponent` you can use `URL` or `URLSearchParams`

```typescript
const url = new URL("https://cdn.example.com/bucket/image.jpg");
url.searchParams.set("outputFormat", "webp");
url.searchParams.set("edits", JSON.stringify(edits));

console.log(url.toString());
// https://cdn.example.com/bucket/image.jpg?outputFormat=webp&edits=%7B%22

// or equivalent
const params = new URLSearchParams();
params.set("outputFormat", "webp");
params.set("edits", JSON.stringify(edits));

console.log("https://cdn.example.com/bucket/image.jpg?" + params.toString());
// https://cdn.example.com/bucket/image.jpg?outputFormat=webp&edits=%7B%22
```

### Thumbor and Rewrites

Thumbor and the Rewrite feature may work, but are not supported. Please use the [original solution](https://github.com/aws-solutions/serverless-image-handler) if required.

## Configuration reference

Required in **bold**

### Cloudformation

#### `--parameters` flag

These parameters can be added using the `--parameters ServerlessImageHandlerStack:<PARAMETER>` command line flag.

| Name                                                                                                                                                                                                                                                                                                                                                   | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Default                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| <details><summary>CorsEnabledParameter</summary><h6>Would you like to enable Cross-Origin Resource Sharing (CORS) for the image handler API? Select 'Yes' if so.</h6></details>                                                                                                                                                                        | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">Yes</code></td><td><code class="notranslate">No</code></td></tr></tbody></table></details>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `No`                                       |
| <details><summary>CorsOriginParameter</summary><h6>If you selected 'Yes' above, please specify an origin value here. A wildcard (\*) value will support any origin. We recommend specifying an origin (i.e. https://example.domain) to restrict cross-site access to your API.</h6></details>                                                          | String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `*`                                        |
| <details><summary><strong>SourceBucketsParameter</strong></summary><h6>(Required) List the buckets (comma-separated) within your account that contain original image files. If you plan to use Thumbor or Custom image requests with this solution, the source bucket for those requests will be the first bucket listed in this field.</h6></details> | String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `defaultBucket, bucketNo2, bucketNo3, ...` |
| <details><summary>DeployDemoUIParameter</summary><h6>Would you like to deploy a demo UI to explore the features and capabilities of this solution? This will create an additional Amazon S3 bucket and Amazon CloudFront distribution in your account. NOTE: The demo UI doesn't work with this fork, <strong>select "No"</strong>.</h6></details>     | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">Yes</code></td><td><code class="notranslate">No</code></td></tr></tbody></table></details>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `Yes`                                      |
| <details><summary>LogRetentionPeriodParameter</summary><h6>This solution automatically logs events to Amazon CloudWatch. Select the amount of time for CloudWatch logs from this solution to be retained (in days).</h6></details>                                                                                                                     | <details><summary>Number</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">1</code></td><td><code class="notranslate">3</code></td><td><code class="notranslate">5</code></td><td><code class="notranslate">7</code></td><td><code class="notranslate">14</code></td><td><code class="notranslate">30</code></td><td><code class="notranslate">60</code></td><td><code class="notranslate">90</code></td><td><code class="notranslate">120</code></td><td><code class="notranslate">150</code></td><td><code class="notranslate">180</code></td><td><code class="notranslate">365</code></td><td><code class="notranslate">400</code></td><td><code class="notranslate">545</code></td><td><code class="notranslate">731</code></td><td><code class="notranslate">1827</code></td><td><code class="notranslate">3653</code></td></tr></tbody></table></details> | `1`                                        |
| <details><summary>AutoWebPParameter</summary><h6>Would you like to enable automatic WebP based on accept headers? Select 'Yes' if so.</h6></details>                                                                                                                                                                                                   | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">Yes</code></td><td><code class="notranslate">No</code></td></tr></tbody></table></details>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `No`                                       |
| <details><summary>EnableSignatureParameter</summary><h6>Would you like to enable the signature? If so, select 'Yes' and provide SecretsManagerSecret and SecretsManagerKey values.</h6></details>                                                                                                                                                      | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">Yes</code></td><td><code class="notranslate">No</code></td></tr></tbody></table></details>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `No`                                       |
| <details><summary>SecretsManagerSecretParameter</summary><h6>The name of AWS Secrets Manager secret. You need to create your secret under this name.</h6></details>                                                                                                                                                                                    | String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `­`                                        |
| <details><summary>SecretsManagerKeyParameter</summary><h6>The name of AWS Secrets Manager secret key. You need to create secret key with this key name. The secret value would be used to check signature.</h6></details>                                                                                                                              | String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `­`                                        |
| <details><summary>EnableDefaultFallbackImageParameter</summary><h6>Would you like to enable the default fallback image? If so, select 'Yes' and provide FallbackImageS3Bucket and FallbackImageS3Key values.</h6></details>                                                                                                                            | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">Yes</code></td><td><code class="notranslate">No</code></td></tr></tbody></table></details>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `No`                                       |
| <details><summary>FallbackImageS3BucketParameter</summary><h6>The name of the Amazon S3 bucket which contains the default fallback image. e.g. my-fallback-image-bucket</h6></details>                                                                                                                                                                 | String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `­`                                        |
| <details><summary>FallbackImageS3KeyParameter</summary><h6>The name of the default fallback image object key including prefix. e.g. prefix/image.jpg</h6></details>                                                                                                                                                                                    | String                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `­`                                        |
| <details><summary>CloudFrontPriceClassParameter</summary><h6>The AWS CloudFront price class to use. For more information see: [Cloudfront documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PriceClass.html)</h6></details>                                                                                            | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">PriceClass_All</code></td><td><code class="notranslate">PriceClass_200</code></td><td><code class="notranslate">PriceClass_100</code></td></tr></tbody></table></details>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `PriceClass_All`                           |

### Context

#### `source/constructs/cdk.json`

These parameters can be added under `context` in `cdk.json`, or using the `--context` command line flag.

| Name                                                                                                                                                                                                                                                                                                              | Type                                                                                                                                                                                               | Default                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| <details><summary>customDomain</summary><h6>Alternative domain name for this distribution. For more information, see [Cloudfront documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html#domainnames)</h6></details>                                              | String                                                                                                                                                                                             | `­`                      |
| <details><summary>originShieldEnabled</summary><h6>Enable Origin Shield to improve cache hit ratio and performance. For more information, see [Origin Shield documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)</h6></details>                                 | <details><summary>String</summary><h6></h6><table role="table"><tbody><tr><td><code class="notranslate">Yes</code></td><td><code class="notranslate">No</code></td></tr></tbody></table></details> | `No`                     |
| <details><summary>originShieldRegion</summary><h6>Must be specified if Origin Shield is not supported in your [AWS_REGION](#environment-variables). See [Origin Shield regions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html#choose-origin-shield-region)</h6></details> | String                                                                                                                                                                                             | `process.env.AWS_REGION` |

### Environment variables

| Name                                                                                                                                                                                                               | Type   | Default     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------- |
| <details><summary>AWS_REGION</summary><h6>Deploy the solution to this region. [Supported regions](https://docs.aws.amazon.com/solutions/latest/serverless-image-handler/supported-aws-regions.html)</h6></details> | String | `us-east-1` |

## License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.  
SPDX-License-Identifier: Apache-2.0
