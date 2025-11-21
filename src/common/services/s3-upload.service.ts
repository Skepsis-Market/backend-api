import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Upload an image to S3
   * @param file - The file buffer to upload
   * @param folder - Optional folder path (e.g., 'markets', 'avatars')
   * @returns Object with S3 URL and key
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'markets',
  ): Promise<{ url: string; key: string }> {
    try {
      console.log('S3 Upload Service - Starting upload');
      console.log('Bucket:', this.bucketName);
      console.log('Region:', this.region);
      console.log('File:', file.originalname, file.size, 'bytes');

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
      
      console.log('Generated S3 key:', fileName);

    // Upload to S3
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL removed - bucket policy will handle public access
      },
    });      console.log('Starting S3 upload...');
      await upload.done();
      console.log('S3 upload completed successfully');

      // Construct public URL
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;

      return { url, key: fileName };
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Delete an image from S3
   * @param key - The S3 object key to delete
   */
  async deleteImage(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Upload base64 image to S3
   * @param base64Data - Base64 encoded image data
   * @param folder - Optional folder path
   * @returns Object with S3 URL and key
   */
  async uploadBase64Image(
    base64Data: string,
    folder: string = 'markets',
  ): Promise<{ url: string; key: string }> {
    // Extract mime type and data
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 image data');
    }

    const mimeType = matches[1];
    const base64Image = matches[2];
    const buffer = Buffer.from(base64Image, 'base64');

    // Get file extension from mime type
    const extension = mimeType.split('/')[1];
    const fileName = `${folder}/${uuidv4()}.${extension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
      // ACL removed - bucket policy will handle public access
    });

    await this.s3Client.send(command);

    // Construct public URL
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;

    return { url, key: fileName };
  }
}
