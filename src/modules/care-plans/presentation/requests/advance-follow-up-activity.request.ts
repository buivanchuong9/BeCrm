import { IsString } from 'class-validator';

export class AdvanceFollowUpActivityRequest {
  @IsString() toStatus!: string;
}
