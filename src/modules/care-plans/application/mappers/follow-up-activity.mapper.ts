import { FollowUpActivity } from '@prisma/client';
import { FollowUpActivityResponseDto } from '../../presentation/responses/follow-up-activity-response.dto';

export function toFollowUpActivityResponse(
  activity: FollowUpActivity,
): FollowUpActivityResponseDto {
  return {
    id: activity.id,
    carePlanId: activity.carePlanId,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    dueDate: activity.dueDate.toISOString(),
    priority: activity.priority,
    status: activity.status,
    automationMode: activity.automationMode,
    automationAction: activity.automationAction,
    lastAutomatedAt: activity.lastAutomatedAt ? activity.lastAutomatedAt.toISOString() : null,
    automationRunCount: activity.automationRunCount,
    version: activity.version,
    createdAt: activity.createdAt.toISOString(),
  };
}
