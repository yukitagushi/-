import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PresignRequestDto } from "./dto/presign.dto";

const DEFAULT_UPLOAD_ENDPOINT = "https://example.invalid/upload";
const DEFAULT_STORAGE_BASE = "https://example.invalid/storage";
const DEFAULT_EXPIRY_SECONDS = 900;

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client | null;
  private readonly bucket: string | undefined;

  constructor() {
    this.bucket = process.env.S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (this.bucket && region) {
      this.s3Client = new S3Client({
        region,
        credentials:
          accessKeyId && secretAccessKey
            ? {
                accessKeyId,
                secretAccessKey
              }
            : undefined
      });
    } else {
      this.s3Client = null;
    }
  }

  async createPresignedUrl(dto: PresignRequestDto) {
    const objectKey = `${randomUUID()}/${encodeURIComponent(dto.filename)}`;

    if (!this.s3Client || !this.bucket) {
      const uploadBase = process.env.UPLOAD_PRESIGN_BASE || DEFAULT_UPLOAD_ENDPOINT;
      const storageBase = process.env.STORAGE_BASE_URL || DEFAULT_STORAGE_BASE;
      return {
        uploadUrl: `${uploadBase}/${objectKey}`,
        method: "PUT",
        headers: {
          "x-demo-presign": "true"
        },
        storageUrl: `${storageBase}/${objectKey}`,
        mode: "dryrun"
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.mimeType || "application/octet-stream"
    });

    const expires = Number(process.env.PRESIGN_EXPIRES_IN || DEFAULT_EXPIRY_SECONDS);
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expires });
    const storageUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${objectKey}`;

    return {
      uploadUrl,
      method: "PUT",
      headers: {
        "Content-Type": dto.mimeType || "application/octet-stream"
      },
      storageUrl,
      mode: "live"
    };
  }
}
