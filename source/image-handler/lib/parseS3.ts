// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

interface S3Object {
  region: string;
  bucket: string;
  key: string;
}

type ParseS3Url = (url: string) => S3Object | Record<string, string> | undefined;

export const s3UrlPattern =
  /^(?:(?:https:\/\/)?s3[.-](?:(?<region>[^.]+).)?amazonaws\.com\/)?(?:(?<bucket>[^/]+)\/?\/)?(?<key>.*?)$/;

export const parseS3Url: ParseS3Url = (url) => url.match(s3UrlPattern)?.groups;
