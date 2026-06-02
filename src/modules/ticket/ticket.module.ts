import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { TicketProcedureController } from './procedure/ticket-procedure.controller';
import { TicketProcedureService } from './procedure/ticket-procedure.service';
import { SupportObjectController } from './support-object/support-object.controller';
import { SupportObjectService } from './support-object/support-object.service';

@Module({
  controllers: [TicketController, TicketProcedureController, SupportObjectController],
  providers: [TicketService, TicketProcedureService, SupportObjectService],
  exports: [TicketService],
})
export class TicketModule {}
