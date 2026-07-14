import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsString, Min, ValidateNested } from 'class-validator';

class NotificationChannelsDto {
  @ApiProperty() @IsBoolean() inApp!: boolean;
  @ApiProperty() @IsBoolean() email!: boolean;
  @ApiProperty() @IsBoolean() sms!: boolean;
  @ApiProperty() @IsBoolean() push!: boolean;
}

class DeviceSettingsDto {
  @ApiProperty() @IsBoolean() biometricLogin!: boolean;
  @ApiProperty() @IsBoolean() mobileNotifications!: boolean;
}

export class UpsertUserPreferenceRequest {
  @ApiProperty({ enum: ['vi-VN', 'en-US'] })
  @IsIn(['vi-VN', 'en-US'])
  locale!: 'vi-VN' | 'en-US';

  @ApiProperty({ example: 'Asia/Ho_Chi_Minh' })
  @IsString()
  timezone!: string;

  @ApiProperty({ enum: ['DD/MM/YYYY', 'MM/DD/YYYY'] })
  @IsIn(['DD/MM/YYYY', 'MM/DD/YYYY'])
  dateFormat!: 'DD/MM/YYYY' | 'MM/DD/YYYY';

  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  @IsIn(['light', 'dark', 'system'])
  theme!: 'light' | 'dark' | 'system';

  @ApiProperty({ type: NotificationChannelsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationChannelsDto)
  notificationChannels!: NotificationChannelsDto;

  @ApiProperty({ type: DeviceSettingsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceSettingsDto)
  deviceSettings!: DeviceSettingsDto;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
