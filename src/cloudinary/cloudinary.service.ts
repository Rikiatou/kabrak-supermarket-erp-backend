import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload un fichier vers Cloudinary
   * @param file Buffer du fichier
   * @param folder Dossier Cloudinary (ex: 'kabrak/logos')
   * @returns URL publique de l'image
   */
  async uploadImage(file: Express.Multer.File, folder = 'kabrak/logos'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
          transformation: [
            { width: 500, height: 500, crop: 'limit' }, // Max 500x500
            { quality: 'auto:good' },
          ],
        },
        (error, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Supprime une image de Cloudinary
   * @param publicId ID public de l'image (extrait de l'URL)
   */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
