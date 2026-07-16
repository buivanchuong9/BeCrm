import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class RescheduleAppointmentRequest {
  @ApiProperty({ description: 'Fresh slotId returned by the availability API.' })
  @IsString()
  @MinLength(40)
  slotId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
