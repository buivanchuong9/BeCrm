import { ApiProperty } from '@nestjs/swagger';

class NotificationChannelsResponseDto {
  @ApiProperty() inApp!: boolean;
  @ApiProperty() email!: boolean;
  @ApiProperty() sms!: boolean;
  @ApiProperty() push!: boolean;
}

class DeviceSettingsResponseDto {
  @ApiProperty() biometricLogin!: boolean;
  @ApiProperty() mobileNotifications!: boolean;
}

export class UserPreferenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: ['vi-VN', 'en-US'] })
  locale!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ enum: ['DD/MM/YYYY', 'MM/DD/YYYY'] })
  dateFormat!: string;

  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  theme!: string;

  @ApiProperty({ type: NotificationChannelsResponseDto })
  notificationChannels!: NotificationChannelsResponseDto;

  @ApiProperty({ type: DeviceSettingsResponseDto })
  deviceSettings!: DeviceSettingsResponseDto;

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
