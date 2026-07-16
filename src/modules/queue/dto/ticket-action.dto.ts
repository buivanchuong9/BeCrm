import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TicketActionRequest {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}

export class CompleteTicketRequest extends TicketActionRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextStation?: string;
}
