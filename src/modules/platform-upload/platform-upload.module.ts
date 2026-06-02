import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        storage: diskStorage({
          destination: cfg.get<string>('UPLOAD_DEST', './uploads'),
          filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${path.extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: cfg.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024) },
      }),
    }),
  ],
  controllers: [UploadController],
})
export class PlatformUploadModule {}
