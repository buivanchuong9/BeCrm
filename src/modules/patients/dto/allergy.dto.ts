import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum AllergyCategoryEnum {
  medication = 'medication',
  food = 'food',
  environment = 'environment',
  contact = 'contact',
  biologic = 'biologic',
  other = 'other',
}

export enum AllergySeverityEnum {
  mild = 'mild',
  moderate = 'moderate',
  severe = 'severe',
  life_threatening = 'life_threatening',
}

export enum AllergyKnowledgeStateEnum {
  unknown = 'unknown',
  no_known_allergies = 'no_known_allergies',
  known_allergies = 'known_allergies',
}

export class CreateAllergyDto {
  @IsEnum(AllergyCategoryEnum) category!: AllergyCategoryEnum;
  @IsString() substance!: string;
  @IsOptional() @IsString() substanceCode?: string;
  @IsOptional() @IsString() reaction?: string;
  @IsOptional() @IsEnum(AllergySeverityEnum) severity?: AllergySeverityEnum;
  @IsOptional() @IsString() onsetDate?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsUUID() clinicLocationId?: string;
  @IsOptional() @IsUUID() encounterId?: string;
}

export class CorrectAllergyDto {
  @IsString() reason!: string;
  @IsOptional() @IsEnum(AllergyCategoryEnum) category?: AllergyCategoryEnum;
  @IsOptional() @IsString() substance?: string;
  @IsOptional() @IsString() substanceCode?: string;
  @IsOptional() @IsString() reaction?: string;
  @IsOptional() @IsEnum(AllergySeverityEnum) severity?: AllergySeverityEnum;
  @IsOptional() @IsString() onsetDate?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsUUID() clinicLocationId?: string;
  @IsOptional() @IsUUID() encounterId?: string;
}

export class EnterInErrorDto {
  @IsString() reason!: string;
}

export class AllergyKnowledgeAssessmentDto {
  @IsEnum(AllergyKnowledgeStateEnum) knowledgeState!: AllergyKnowledgeStateEnum;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsUUID() clinicLocationId?: string;
  @IsOptional() @IsUUID() encounterId?: string;
}

// Kept for backward compatibility with the list endpoint if needed; not used in service.
export class UpdateAllergyDto {
  @IsOptional() @IsEnum(AllergyCategoryEnum) category?: AllergyCategoryEnum;
  @IsOptional() @IsString() substance?: string;
  @IsOptional() @IsString() substanceCode?: string;
  @IsOptional() @IsString() reaction?: string;
  @IsOptional() @IsEnum(AllergySeverityEnum) severity?: AllergySeverityEnum;
  @IsOptional() @IsString() onsetDate?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
