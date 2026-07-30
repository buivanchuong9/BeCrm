import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

const GENDER_VALUES = ['male', 'female', 'other', 'unknown'] as const;
const BLOOD_TYPE_VALUES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;

export class UpdatePatientRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, format: 'date', example: '1995-03-15' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dob must be YYYY-MM-DD' })
  dob?: string;

  @ApiProperty({ required: false, enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES)
  gender?: (typeof GENDER_VALUES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ required: false, enum: BLOOD_TYPE_VALUES })
  @IsOptional()
  @IsIn(BLOOD_TYPE_VALUES)
  bloodType?: (typeof BLOOD_TYPE_VALUES)[number];

  @ApiProperty({ type: Number, required: false, nullable: true, minimum: 50, maximum: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(250)
  heightCm?: number | null;

  @ApiProperty({ type: Number, required: false, nullable: true, minimum: 2, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(2)
  @Max(500)
  weightKg?: number | null;

  @ApiProperty({ type: String, required: false, format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.primaryDoctorId !== null)
  @IsUUID()
  primaryDoctorId?: string | null;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
