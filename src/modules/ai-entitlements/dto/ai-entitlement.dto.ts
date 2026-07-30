import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAiCreditPurchaseRequest {
  @ApiProperty({ minimum: 1, maximum: 100, example: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  credits!: number;
}

export class CreateAiPlanChangeRequest {
  @ApiProperty({ enum: ['free', 'plus', 'pro', 'max'] })
  @IsString()
  planCode!: string;
}

export class DecideAiCommercialRequest {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';
}

export class AiPlanDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() annualPriceVnd!: number;
  @ApiPropertyOptional({ nullable: true }) monthlyIncludedCredits!: number | null;
  @ApiProperty() extraCreditUnitPriceVnd!: number;
  @ApiProperty() description!: string;
  @ApiProperty({ type: [String] }) features!: string[];
}

export class AiUsageActivityDto {
  @ApiProperty() id!: string;
  @ApiProperty() caseId!: string;
  @ApiProperty() occurredAt!: string;
  @ApiProperty() bodyRegion!: string;
  @ApiProperty() resultStatus!: string;
  @ApiProperty() modelVersion!: string;
  @ApiProperty({ enum: ['included', 'purchased'] }) allowanceKind!: string;
}

export class AiCommercialRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['credit_purchase', 'plan_change'] }) type!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() credits?: number;
  @ApiPropertyOptional() planCode?: string;
  @ApiProperty() totalPriceVnd!: number;
  @ApiProperty() createdAt!: string;
}

export class AiEntitlementResponseDto {
  @ApiProperty({ type: AiPlanDto }) plan!: AiPlanDto;
  @ApiProperty({ type: [AiPlanDto] }) availablePlans!: AiPlanDto[];
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiPropertyOptional({ nullable: true }) includedQuota!: number | null;
  @ApiProperty() includedUsed!: number;
  @ApiProperty() extraCreditBalance!: number;
  @ApiPropertyOptional({ nullable: true }) remainingCredits!: number | null;
  @ApiProperty() usagePercent!: number;
  @ApiProperty() purchaseMinCredits!: number;
  @ApiProperty() purchaseMaxCredits!: number;
  @ApiProperty() purchaseUnitPriceVnd!: number;
  @ApiProperty({ type: [AiUsageActivityDto] }) usageHistory!: AiUsageActivityDto[];
  @ApiProperty({ type: [AiCommercialRequestDto] })
  pendingRequests!: AiCommercialRequestDto[];
}

export class AiCommercialRequestResponseDto extends AiCommercialRequestDto {}

export class AiDecisionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['approved', 'rejected'] }) status!: string;
}
