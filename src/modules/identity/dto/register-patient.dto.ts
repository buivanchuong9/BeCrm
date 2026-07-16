import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';

const GENDER_VALUES = ['male', 'female', 'other', 'unknown'] as const;

/** Public patient self-registration — docs/api.md's original design proposed
 * this only as staff invitation; a public self-service path is added here
 * per product direction. Every field the server derives (organizationId
 * membership role, account status, patient code) is still never accepted
 * from the client beyond picking which organization to register with. */
export class RegisterPatientRequest {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Minimum 12 characters.' })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty()
  @IsString()
  name!: string;

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
  address?: string;

  @ApiProperty({ required: false, format: 'uuid', description: 'Organization id when known.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ required: false, description: 'Public organization code, e.g. dermahealth.' })
  @IsOptional()
  @IsString()
  organizationCode?: string;
}
