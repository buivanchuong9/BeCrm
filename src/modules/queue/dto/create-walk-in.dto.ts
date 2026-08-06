import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateWalkInTicketRequest {
  @IsUUID()
  clinicLocationId!: string;

  @IsNotEmpty()
  @IsString()
  serviceCode!: string;

  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @Matches(/^[0-9+ ]{9,15}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
