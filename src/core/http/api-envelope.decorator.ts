import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';

/** Every success response is wrapped as {success, data, meta, requestId} by the global
 * ResponseInterceptor — Nest's Swagger generator can't see that dynamically,
 * so these helpers declare the envelope explicitly around a given DTO. */
export class EmptyMeta {}

function envelopeSchema(model: Type<unknown>, isArray: boolean) {
  return {
    allOf: [
      {
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
          meta: { type: 'object' },
          requestId: { type: 'string', format: 'uuid' },
        },
        required: ['success', 'data', 'meta', 'requestId'],
      },
    ],
  };
}

export function ApiOkEnvelope(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({ schema: envelopeSchema(model, false) }),
  );
}

export function ApiCreatedEnvelope(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiCreatedResponse({ schema: envelopeSchema(model, false) }),
  );
}

export function ApiCreatedUnionEnvelope(...models: Type<unknown>[]) {
  return applyDecorators(
    ApiExtraModels(...models),
    ApiCreatedResponse({
      schema: {
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { oneOf: models.map((model) => ({ $ref: getSchemaPath(model) })) },
          meta: { type: 'object' },
          requestId: { type: 'string', format: 'uuid' },
        },
        required: ['success', 'data', 'meta', 'requestId'],
      },
    }),
  );
}

export function ApiOkListEnvelope(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({ schema: envelopeSchema(model, true) }),
  );
}

export class OffsetPageMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
