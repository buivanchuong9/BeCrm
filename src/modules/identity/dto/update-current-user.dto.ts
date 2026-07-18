import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateCurrentUserRequest {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName?: string;

  @ApiProperty({
    required: false,
    deprecated: true,
    description: 'Deprecated alias for displayName.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  avatarFileId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
