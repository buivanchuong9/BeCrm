import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSkinCaseRequest {
  @IsIn(['accepted', 'rejected', 'different_diagnosis', 'image_unsuitable'])
  decision!: 'accepted' | 'rejected' | 'different_diagnosis' | 'image_unsuitable';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  note?: string;
}
