import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BpmGridDataService {
  constructor(private prisma: PrismaService) {}

  async saveGridData(dto: Record<string, unknown>, actor: RequestUser) {
    const { formId, taskTokenId, processInstanceId, gridKey, rows, schema } = dto;
    return this.prisma.bpmGridData.create({
      data: {
        tenantId: actor.tenantId,
        formId: formId as string | undefined,
        taskTokenId: taskTokenId as string | undefined,
        processInstanceId: processInstanceId as string | undefined,
        gridKey: gridKey as string,
        rows: rows as any,
        schema: schema as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async lookupGridData(dto: Record<string, unknown>, tenantId: string) {
    const { gridKey, processInstanceId, filters } = dto;
    
    // In a real application, filters should be applied here against the JSON 'rows' array
    // This is a basic stub that retrieves all rows for a gridKey in an instance
    const result = await this.prisma.bpmGridData.findMany({
      where: {
        tenantId,
        gridKey: gridKey as string,
        processInstanceId: processInstanceId as string | undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Just return latest submissions for lookup
    });

    return result;
  }
}
