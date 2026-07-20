import { ApiProperty } from '@nestjs/swagger';

/** docs/api.md section 26 `ReferenceResponse` — shared across every module
 * that projects a related entity as `{id, code?, name}` rather than a full
 * nested resource. */
export class ReferenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty()
  name!: string;
}
