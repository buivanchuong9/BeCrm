import { Module } from '@nestjs/common';
import { DoctorsController, PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';

@Module({
  controllers: [PractitionersController, DoctorsController],
  providers: [PractitionersService],
  exports: [PractitionersService],
})
export class PractitionersModule {}
