import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Matches docs/api.md section 26 `CreateSessionRequest` exactly. */
export class CreateSessionRequest {
  @ApiProperty({ example: 'nguyenvana@example.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'a-strong-password' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  rememberMe!: boolean;

  @ApiProperty({ required: false, description: 'Reserved for MFA rollout; not yet enforced.' })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class EndAllSessionsRequest {
  @ApiProperty({
    required: false,
    description: 'Optional re-confirmation of the current password.',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
