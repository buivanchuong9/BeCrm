import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

const GENDER_VALUES = ['male', 'female', 'other', 'unknown'] as const;
const BLOOD_TYPE_VALUES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;

/** Self-service "become a patient too" request for an already-authenticated
 * staff/admin account that has no linked Patient row yet. Unlike
 * RegisterPatientRequest (anonymous signup: creates the User itself), this
 * only supplies the fields the existing User record doesn't already have —
 * name/email are taken from the account, not accepted here. */
export class CreateSelfPatientRequest {
  @ApiProperty({ format: 'date', example: '1995-03-15' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dob must be YYYY-MM-DD' })
  dob!: string;

  @ApiProperty({ enum: GENDER_VALUES })
  @IsIn(GENDER_VALUES)
  gender!: (typeof GENDER_VALUES)[number];

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ required: false, enum: BLOOD_TYPE_VALUES })
  @IsOptional()
  @IsIn(BLOOD_TYPE_VALUES)
  bloodType?: (typeof BLOOD_TYPE_VALUES)[number];

  @ApiProperty({ required: false, nullable: true, minimum: 50, maximum: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(250)
  heightCm?: number | null;

  @ApiProperty({ required: false, nullable: true, minimum: 2, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(2)
  @Max(500)
  weightKg?: number | null;
}
