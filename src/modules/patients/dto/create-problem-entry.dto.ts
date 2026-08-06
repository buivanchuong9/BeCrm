import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProblemEntryDto {
  @IsString() @MaxLength(200) conditionName!: string;
  @IsOptional() @IsString() @MaxLength(20) conditionCode?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'resolved']) status?: string;
  @IsOptional() @IsDateString() onsetDate?: string;
  @IsOptional() @IsString() @MaxLength(50) severity?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class UpdateProblemEntryDto {
  @IsOptional() @IsString() @MaxLength(200) conditionName?: string;
  @IsOptional() @IsString() @MaxLength(20) conditionCode?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'resolved']) status?: string;
  @IsOptional() @IsDateString() onsetDate?: string;
  @IsOptional() @IsString() @MaxLength(50) severity?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
