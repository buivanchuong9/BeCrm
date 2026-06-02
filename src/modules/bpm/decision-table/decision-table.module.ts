import { Module } from '@nestjs/common';
import { DecisionTableController } from './decision-table.controller';
import { DecisionTableService } from './decision-table.service';

@Module({ controllers: [DecisionTableController], providers: [DecisionTableService], exports: [DecisionTableService] })
export class DecisionTableModule {}
