import { Controller, GoneException, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiGoneResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('ai-assessment')
@ApiBearerAuth()
@Controller({ path: 'ai/skin-analysis', version: '1' })
export class SkinAnalysisController {
  @Post()
  @ApiOperation({
    summary: '[DEPRECATED] Endpoint một ảnh đã ngừng để tránh bỏ qua quota',
    deprecated: true,
    description:
      'Dùng POST /api/v1/ai/skin-analysis-cases với patientId. Endpoint cũ không xác định được bệnh nhân để trừ quota nên trả HTTP 410.',
  })
  @ApiGoneResponse({
    description: 'Dùng endpoint skin-analysis-cases có patientId để ghi quota.',
  })
  analyze() {
    throw new GoneException(
      'Endpoint này đã ngừng. Dùng /api/v1/ai/skin-analysis-cases với patientId để ghi nhận quota và lịch sử AI.',
    );
  }
}
