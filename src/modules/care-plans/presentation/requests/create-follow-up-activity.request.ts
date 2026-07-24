import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const PRIORITIES = ['low', 'medium', 'high'] as const;
const CREATE_STATUSES = ['scheduled', 'due'] as const;
const AUTOMATION_MODES = ['automatic', 'patient_action', 'human_review'] as const;

export class CreateFollowUpActivityRequest {
  @Transform(trim) @IsString() @Length(1, 100) type!: string;
  @Transform(trim) @IsString() @Length(1, 300) title!: string;
  @Transform(trim) @IsString() @Length(0, 5000) description!: string;
  @IsDateString() dueDate!: string;
  @IsIn(PRIORITIES) priority!: (typeof PRIORITIES)[number];
  @IsOptional() @IsIn(CREATE_STATUSES) status?: (typeof CREATE_STATUSES)[number];
  @IsOptional() @IsIn(AUTOMATION_MODES) automationMode?: (typeof AUTOMATION_MODES)[number];
  @IsOptional() @Transform(trim) @IsString() @Length(0, 1000) automationAction?: string;
}
