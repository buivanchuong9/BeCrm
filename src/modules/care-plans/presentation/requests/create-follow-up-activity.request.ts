import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFollowUpActivityRequest {
  @IsString() type!: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsDateString() dueDate!: string;
  @IsString() priority!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() automationMode?: string;
  @IsOptional() @IsString() automationAction?: string;
}
