import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { BpmNodeController } from './bpm-node.controller';
import { BpmNodeService } from './bpm-node.service';

function resolveUploadDest(cfg: ConfigService): string {
  const dest = path.resolve(cfg.get<string>('UPLOAD_DEST', './uploads'));
  fs.mkdirSync(dest, { recursive: true });
  return dest;
}

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        storage: diskStorage({
          destination: resolveUploadDest(cfg),
          filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${path.extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: cfg.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024) },
      }),
    }),
  ],
  controllers: [BpmNodeController],
  providers: [BpmNodeService],
  exports: [BpmNodeService],
})
export class BpmNodeModule {}
