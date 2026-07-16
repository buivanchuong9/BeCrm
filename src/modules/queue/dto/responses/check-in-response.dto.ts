import { ApiProperty } from '@nestjs/swagger';
import { QueueTicketResponseDto } from './queue-ticket-response.dto';

export class CheckInResponseDto {
  @ApiProperty({ type: QueueTicketResponseDto })
  ticket!: QueueTicketResponseDto;

  @ApiProperty({
    description:
      'true if this exact token was already redeemed and the same ticket is being replayed (docs/api.md section 12/41 idempotent rescan) — not an error.',
  })
  repeated!: boolean;
}
