import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOkEnvelope } from '../../core/http/api-envelope.decorator';
import { SkinAnalysisResponseDto } from './dto/responses/skin-analysis-response.dto';
import { SkinAnalysisService } from './skin-analysis.service';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

@ApiTags('ai-assessment')
@ApiBearerAuth()
@Controller({ path: 'ai/skin-analysis', version: '1' })
export class SkinAnalysisController {
  constructor(private readonly skinAnalysis: SkinAnalysisService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phân tích ảnh da bằng EfficientNet-B0',
    description:
      'Nhận một ảnh da và chuyển đến AI inference service nội bộ. Kết quả chỉ dùng để sàng lọc, không thay thế chẩn đoán của bác sĩ.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkEnvelope(SkinAnalysisResponseDto)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: MAX_IMAGE_BYTES },
    }),
  )
  analyze(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    },
  ) {
    return this.skinAnalysis.analyze(file);
  }
}
