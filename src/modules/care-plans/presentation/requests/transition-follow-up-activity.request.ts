import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Length, Min, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const KANBAN_STATUSES = ['scheduled', 'due', 'completed', 'escalated', 'cancelled'] as const;
const REASON_REQUIRED_STATUSES: string[] = ['cancelled', 'escalated'];

export class TransitionFollowUpActivityRequest {
  @IsIn(KANBAN_STATUSES) toStatus!: (typeof KANBAN_STATUSES)[number];

  @ValidateIf((o: TransitionFollowUpActivityRequest) =>
    REASON_REQUIRED_STATUSES.includes(o.toStatus),
  )
  @Transform(trim)
  @IsString()
  @Length(3, 1000)
  reason?: string;

  @IsInt() @Min(1) version!: number;
}
