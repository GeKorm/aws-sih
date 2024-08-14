// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockAwsS3, mockAwsSecretManager } from "../mock";

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { ImageFormatTypes, ImageHandlerError, RequestTypes, StatusCodes } from "../../lib";
import { SecretProvider } from "../../secret-provider";

describe("setup", () => {
  const OLD_ENV = process.env;
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  let secretProvider = new SecretProvider(secretsManager);

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    jest.clearAllMocks();
    secretProvider = new SecretProvider(secretsManager); // need to re-create the provider to make sure the secret is not cached
    process.env = OLD_ENV;
  });

  it("Should pass when a default image request is provided and populate the ImageRequest object with the proper values", async () => {
    // Arrange
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
      queryStringParameters: {
        edits: JSON.stringify({ grayscale: true }),
        outputFormat: ImageFormatTypes.JPEG,
      },
    };
    process.env.SOURCE_BUCKETS = "validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "validBucket",
      key: "validKey",
      edits: { grayscale: true },
      outputFormat: "jpeg",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/jpeg",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "validBucket",
      Key: "validKey",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when a default image request is provided and populate the ImageRequest object with the proper values with UTF-8 key", async () => {
    // Arrange
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/validBucket/中文",
      queryStringParameters: {
        edits: JSON.stringify({ grayscale: true }),
        outputFormat: ImageFormatTypes.JPEG,
      },
    };
    process.env = { SOURCE_BUCKETS: "validBucket, validBucket2" };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "validBucket",
      key: "中文",
      edits: { grayscale: true },
      outputFormat: "jpeg",
      originalImage: Buffer.from("SampleImageContent\n"),
      contentType: "image/jpeg",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "validBucket",
      Key: "中文",
    });
    expect(imageRequestInfo).toMatchObject(expectedResult);
  });

  it("Should pass when a default image request is provided and populate the ImageRequest object with the proper values", async () => {
    // Arrange
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
      queryStringParameters: {
        edits: JSON.stringify({ toFormat: "png" }),
      },
    };
    process.env.SOURCE_BUCKETS = "validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "validBucket",
      key: "validKey",
      edits: { toFormat: "png" },
      outputFormat: "png",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/png",
    };
    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "validBucket",
      Key: "validKey",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values", async () => {
    // Arrange
    const event = { path: "/thumbor/filters:grayscale()/test-image-001.jpg" };
    process.env.SOURCE_BUCKETS = "allowedBucket001, allowedBucket002";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Thumbor",
      bucket: "allowedBucket001",
      key: "test-image-001.jpg",
      edits: { grayscale: true },
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "allowedBucket001",
      Key: "test-image-001.jpg",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when a thumbor image request is provided and populate the ImageRequest object with the proper values", async () => {
    // Arrange
    const event = {
      path: "/thumbor/filters:format(png)/filters:quality(50)/test-image-001.jpg",
    };
    process.env.SOURCE_BUCKETS = "allowedBucket001, allowedBucket002";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Thumbor",
      bucket: "allowedBucket001",
      key: "test-image-001.jpg",
      edits: {
        toFormat: "png",
        png: { quality: 50 },
      },
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      outputFormat: "png",
      contentType: "image/png",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "allowedBucket001",
      Key: "test-image-001.jpg",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when a custom image request is provided and populate the ImageRequest object with the proper values", async () => {
    // Arrange
    const event = {
      path: "/thumbor/filters-rotate(90)/filters-grayscale()/custom-image.jpg",
    };
    process.env = {
      SOURCE_BUCKETS: "allowedBucket001, allowedBucket002",
      REWRITE_MATCH_PATTERN: "/(filters-)/gm",
      REWRITE_SUBSTITUTION: "filters:",
    };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({
          CacheControl: "max-age=300,public",
          ContentType: "custom-type",
          Expires: "Tue, 24 Dec 2019 13:46:28 GMT",
          LastModified: "Sat, 19 Dec 2009 16:30:47 GMT",
          Body: Buffer.from("SampleImageContent\n"),
        });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: RequestTypes.CUSTOM,
      bucket: "allowedBucket001",
      key: "custom-image.jpg",
      edits: {
        grayscale: true,
        rotate: 90,
      },
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=300,public",
      contentType: "custom-type",
      expires: "Tue, 24 Dec 2019 13:46:28 GMT",
      lastModified: "Sat, 19 Dec 2009 16:30:47 GMT",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "allowedBucket001",
      Key: "custom-image.jpg",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when a custom image request is provided and populate the ImageRequest object with the proper values and no file extension", async () => {
    // Arrange
    const event = {
      path: "/thumbor/filters-rotate(90)/filters-grayscale()/custom-image",
    };
    process.env = {
      SOURCE_BUCKETS: "allowedBucket001, allowedBucket002",
      REWRITE_MATCH_PATTERN: "/(filters-)/gm",
      REWRITE_SUBSTITUTION: "filters:",
    };

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({
          CacheControl: "max-age=300,public",
          ContentType: "custom-type",
          Expires: "Tue, 24 Dec 2019 13:46:28 GMT",
          LastModified: "Sat, 19 Dec 2009 16:30:47 GMT",
          Body: Buffer.from("SampleImageContent\n"),
        });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: RequestTypes.CUSTOM,
      bucket: "allowedBucket001",
      key: "custom-image",
      edits: {
        grayscale: true,
        rotate: 90,
      },
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=300,public",
      contentType: "custom-type",
      expires: "Tue, 24 Dec 2019 13:46:28 GMT",
      lastModified: "Sat, 19 Dec 2009 16:30:47 GMT",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "allowedBucket001",
      Key: "custom-image",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when an error is caught", async () => {
    // Arrange
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
      queryStringParameters: {
        edits: JSON.stringify({ grayscale: true }),
      },
    };
    process.env.SOURCE_BUCKETS = "allowedBucket001, allowedBucket002";

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    // Assert
    try {
      await imageRequest.setup(event);
    } catch (error) {
      expect(error.code).toEqual("ImageBucket::CannotAccessBucket");
    }
  });

  describe("enableSignature", () => {
    beforeAll(() => {
      process.env.ENABLE_SIGNATURE = "Yes";
      process.env.SECRETS_MANAGER = "serverless-image-handler";
      process.env.SECRET_KEY = "signatureKey";
      process.env.SOURCE_BUCKETS = "validBucket";
    });

    it("Should pass when the image signature is correct", async () => {
      // Arrange
      const event = {
        path: "/https://s3.amazonaws.com/validBucket/validKey",
        queryStringParameters: {
          edits: JSON.stringify({ toFormat: "png" }),
          signature: "3fa06eb87cd62812a125369598073a0189cba78b32f1a25d7f953b3529a73bae",
        },
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
        },
      }));
      mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            SecretString: JSON.stringify({
              [process.env.SECRET_KEY]: "secret",
            }),
          });
        },
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: "Default",
        bucket: "validBucket",
        key: "validKey",
        edits: { toFormat: "png" },
        outputFormat: "png",
        originalImage: Buffer.from("SampleImageContent\n"),
        cacheControl: "max-age=31536000,public",
        contentType: "image/png",
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({
        Bucket: "validBucket",
        Key: "validKey",
      });
      expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({
        SecretId: process.env.SECRETS_MANAGER,
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it("Should throw an error when queryStringParameters are missing", async () => {
      // Arrange
      const event = {
        path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
        queryStringParameters: {
          edits: JSON.stringify({ toFormat: "png" }),
        },
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          code: "AuthorizationQueryParametersError",
          message: "Query-string requires the signature parameter.",
        });
      }
    });

    it("Should throw an error when the image signature query parameter is missing", async () => {
      // Arrange
      const event = {
        path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
        queryStringParameters: {
          edits: JSON.stringify({ toFormat: "png" }),
        },
      };

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(error).toMatchObject({
          status: StatusCodes.BAD_REQUEST,
          message: "Query-string requires the signature parameter.",
          code: "AuthorizationQueryParametersError",
        });
      }
    });

    it("Should throw an error when signature does not match", async () => {
      // Arrange
      const event = {
        path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
        queryStringParameters: {
          edits: JSON.stringify({ toFormat: "png" }),
          signature: "invalid",
        },
      };

      // Mock
      mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            SecretString: JSON.stringify({
              [process.env.SECRET_KEY]: "secret",
            }),
          });
        },
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({
          SecretId: process.env.SECRETS_MANAGER,
        });
        expect(error).toMatchObject({
          status: 403,
          message: "Signature does not match.",
          code: "SignatureDoesNotMatch",
        });
      }
    });

    it("Should throw an error when any other error occurs", async () => {
      // Arrange
      const event = {
        path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
        queryStringParameters: {
          edits: JSON.stringify({ toFormat: "png" }),
          signature: "4d41311006641a56de7bca8abdbda91af254506107a2c7b338a13ca2fa95eac3",
        },
      };

      // Mock
      mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
        promise() {
          return Promise.reject(
            new ImageHandlerError(StatusCodes.INTERNAL_SERVER_ERROR, "InternalServerError", "SimulatedError")
          );
        },
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      try {
        await imageRequest.setup(event);
      } catch (error) {
        // Assert
        expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({
          SecretId: process.env.SECRETS_MANAGER,
        });
        expect(error).toMatchObject({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Signature validation failed.",
          code: "SignatureValidationFailure",
        });
      }
    });
  });

  describe("SVGSupport", () => {
    beforeAll(() => {
      process.env.ENABLE_SIGNATURE = "No";
      process.env.SOURCE_BUCKETS = "validBucket";
    });

    it("Should return SVG image when no edit is provided for the SVG image", async () => {
      // Arrange
      const event = {
        path: "/image.svg",
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            ContentType: "image/svg+xml",
            Body: Buffer.from("SampleImageContent\n"),
          });
        },
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: "Default",
        bucket: "validBucket",
        key: "image.svg",
        edits: undefined,
        originalImage: Buffer.from("SampleImageContent\n"),
        cacheControl: "max-age=31536000,public",
        contentType: "image/svg+xml",
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({
        Bucket: "validBucket",
        Key: "image.svg",
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it("Should return WebP image when there are any edits and no output is specified for the SVG image", async () => {
      // Arrange
      const event = {
        path: "validBucket/image.svg",
        queryStringParameters: {
          edits: JSON.stringify({ resize: { width: 100, height: 100 } }),
        },
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            ContentType: "image/svg+xml",
            Body: Buffer.from("SampleImageContent\n"),
          });
        },
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: "Default",
        bucket: "validBucket",
        key: "image.svg",
        edits: { resize: { width: 100, height: 100 } },
        outputFormat: "png",
        originalImage: Buffer.from("SampleImageContent\n"),
        cacheControl: "max-age=31536000,public",
        contentType: "image/png",
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({
        Bucket: "validBucket",
        Key: "image.svg",
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });

    it("Should return JPG image when output is specified to JPG for the SVG image", async () => {
      // Arrange
      const event = {
        path: "/thumbor/filters:format(jpg)/image.svg",
      };

      // Mock
      mockAwsS3.getObject.mockImplementationOnce(() => ({
        promise() {
          return Promise.resolve({
            ContentType: "image/svg+xml",
            Body: Buffer.from("SampleImageContent\n"),
          });
        },
      }));

      // Act
      const imageRequest = new ImageRequest(s3Client, secretProvider);
      const imageRequestInfo = await imageRequest.setup(event);
      const expectedResult = {
        requestType: "Thumbor",
        bucket: "validBucket",
        key: "image.svg",
        edits: { toFormat: "jpeg" },
        outputFormat: "jpeg",
        originalImage: Buffer.from("SampleImageContent\n"),
        cacheControl: "max-age=31536000,public",
        contentType: "image/jpeg",
      };

      // Assert
      expect(mockAwsS3.getObject).toHaveBeenCalledWith({
        Bucket: "validBucket",
        Key: "image.svg",
      });
      expect(imageRequestInfo).toEqual(expectedResult);
    });
  });

  it("Should pass and return the customer headers if custom headers are provided", async () => {
    // Arrange
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/validBucket/validKey",
      queryStringParameters: {
        headers: JSON.stringify({ "Cache-Control": "max-age=31536000,public" }),
        outputFormat: ImageFormatTypes.JPEG,
      },
    };
    process.env.SOURCE_BUCKETS = "validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "validBucket",
      key: "validKey",
      headers: { "Cache-Control": "max-age=31536000,public" },
      outputFormat: "jpeg",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/jpeg",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "validBucket",
      Key: "validKey",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when valid reduction effort is provided and output is webp", async () => {
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/test/test.png",
      queryStringParameters: {
        outputFormat: ImageFormatTypes.WEBP,
        reductionEffort: 3,
      },
    };
    process.env.SOURCE_BUCKETS = "test, validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "test",
      key: "test.png",
      edits: undefined,
      headers: undefined,
      outputFormat: "webp",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/webp",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "test",
      Key: "test.png",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass and use default reduction effort if it is invalid type and output is webp", async () => {
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/test/test.png",
      queryStringParameters: {
        outputFormat: ImageFormatTypes.WEBP,
        reductionEffort: "test",
      },
    };
    process.env.SOURCE_BUCKETS = "test, validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "test",
      key: "test.png",
      edits: undefined,
      headers: undefined,
      outputFormat: "webp",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/webp",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "test",
      Key: "test.png",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass and use default reduction effort if it is out of range and output is webp", async () => {
    const event = {
      path: "/https://s3.amazonaws.com/test/test.png",
      queryStringParameters: {
        outputFormat: ImageFormatTypes.WEBP,
        reductionEffort: 10,
      },
    };
    process.env.SOURCE_BUCKETS = "test, validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "test",
      key: "test.png",
      edits: undefined,
      headers: undefined,
      outputFormat: "webp",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/webp",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "test",
      Key: "test.png",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass and not use reductionEffort if it is not provided and output is webp", async () => {
    const event = {
      path: "/https://s3-eu-west-1.amazonaws.com/test/test.png",
      queryStringParameters: {
        outputFormat: ImageFormatTypes.WEBP,
      },
    };
    process.env.SOURCE_BUCKETS = "test, validBucket, validBucket2";

    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
      },
    }));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "test",
      key: "test.png",
      edits: undefined,
      headers: undefined,
      outputFormat: "webp",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/webp",
    };

    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({
      Bucket: "test",
      Key: "test.png",
    });
    expect(imageRequestInfo).toEqual(expectedResult);
  });

  it("Should pass when a default image request is provided and populate the ImageRequest object with the proper values and a utf-8 key", async function () {
    // Arrange
    const event = {
      path: "/test/中文",
      queryStringParameters: {
        outputFormat: ImageFormatTypes.JPEG,
        edits: JSON.stringify({ grayscale: true }),
      },
    };
    process.env = {
      SOURCE_BUCKETS: "test, test2",
    };
    // Mock
    mockAwsS3.getObject.mockImplementationOnce(() => {
      return {
        promise() {
          return Promise.resolve({ Body: Buffer.from("SampleImageContent\n") });
        },
      };
    });
    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const imageRequestInfo = await imageRequest.setup(event);
    const expectedResult = {
      requestType: "Default",
      bucket: "test",
      key: "中文",
      edits: { grayscale: true },
      headers: undefined,
      outputFormat: "jpeg",
      originalImage: Buffer.from("SampleImageContent\n"),
      cacheControl: "max-age=31536000,public",
      contentType: "image/jpeg",
    };
    // Assert
    expect(mockAwsS3.getObject).toHaveBeenCalledWith({ Bucket: "test", Key: "中文" });
    expect(imageRequestInfo).toEqual(expectedResult);
  });
});
