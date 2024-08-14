// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { parseS3Url } from "../../lib";

describe("parseS3Url", () => {
  it("Should return null when used with non-S3 URL", () => {
    const url = "https://example.com/path?key=value";
    const parsed = parseS3Url(url);
    expect(parsed).toBeUndefined;
  });

  it("Should extract info from S3 URL without extension", () => {
    const url = "https://s3-eu-west-1.amazonaws.com/bucket-name-here/key-name-here";
    const { bucket, key } = parseS3Url(url);
    expect(bucket).toBe('bucket-name-here');
    expect(key).toBe('key-name-here');
  });

  it("Should extract info from S3 URL with extension", () => {
    const url = "https://s3-eu-west-1.amazonaws.com/source-bucket/test.jpg";
    const { bucket, key, region } = parseS3Url(url);
    expect(region).toBe('eu-west-1');
    expect(bucket).toBe('source-bucket');
    expect(key).toBe('test.jpg');
  });

  it("Should extract info from S3 URL without protocol", () => {
    const url = "s3-eu-west-1.amazonaws.com/source-bucket/test.jpg";
    const { bucket, key, region } = parseS3Url(url);
    expect(region).toBe('eu-west-1');
    expect(bucket).toBe('source-bucket');
    expect(key).toBe('test.jpg');
  });

  it("Should extract info from S3 URL with dot notation", () => {
    const url = "s3.eu-west-1.amazonaws.com/source-bucket/test.jpg";
    const { bucket, key, region } = parseS3Url(url);
    expect(region).toBe('eu-west-1');
    expect(bucket).toBe('source-bucket');
    expect(key).toBe('test.jpg');
  });

  it("Should extract bucket and key from S3 URL without region", () => {
    const url = "s3.amazonaws.com/source-bucket/test.jpg";
    const { bucket, key, region } = parseS3Url(url);
    expect(region).toBeUndefined;
    expect(bucket).toBe('source-bucket');
    expect(key).toBe('test.jpg');
  });

  it("Should extract key from S3 URL without bucket", () => {
    const url = "https://s3-eu-west-1.amazonaws.com/test.jpg";
    const { bucket, key, region } = parseS3Url(url);
    expect(region).toBeUndefined;
    expect(bucket).toBeUndefined;
    expect(key).toBe('test.jpg');
  });

  it("Should extract key from S3 URL without bucket or region", () => {
    const url = "s3.amazonaws.com/test.jpg";
    const { bucket, key, region } = parseS3Url(url);
    expect(region).toBeUndefined;
    expect(bucket).toBeUndefined;
    expect(key).toBe('test.jpg');
  });
});
