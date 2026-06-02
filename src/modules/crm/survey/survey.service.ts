import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class SurveyService {
  constructor(private prisma: PrismaService) {}
  private bw(tenantId: string) { return { tenantId, deletedAt: null }; }

  async listSurveys(tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.cxmSurvey.findMany({ where: this.bw(tenantId), skip: (page - 1) * limit, take: limit, include: { questions: { where: { deletedAt: null }, include: { options: { where: { deletedAt: null } } } } } }),
      this.prisma.cxmSurvey.count({ where: this.bw(tenantId) }),
    ]);
    return { data, total, page, limit };
  }

  async upsertSurvey(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.cxmSurvey.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.cxmSurvey.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, description: dto.description as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async getSurvey(id: string) {
    return this.prisma.cxmSurvey.findUnique({ where: { id }, include: { questions: { where: { deletedAt: null }, include: { options: { where: { deletedAt: null } } } } } });
  }

  async surveySummary(tenantId: string) {
    const total = await this.prisma.cxmSurvey.count({ where: { tenantId, deletedAt: null } });
    return { total };
  }

  async deleteSurvey(id: string, actor: RequestUser) {
    await this.prisma.cxmSurvey.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listQuestions(surveyId: string) {
    return this.prisma.cxmQuestion.findMany({ where: { surveyId, deletedAt: null }, orderBy: { position: 'asc' }, include: { options: { where: { deletedAt: null } } } });
  }

  async getQuestion(id: string) {
    return this.prisma.cxmQuestion.findUnique({ where: { id }, include: { options: { where: { deletedAt: null } } } });
  }

  async listOptions(questionId: string) {
    return this.prisma.cxmOption.findMany({ where: { questionId, deletedAt: null }, orderBy: { position: 'asc' } });
  }

  async getOption(id: string) {
    return this.prisma.cxmOption.findUnique({ where: { id } });
  }

  async upsertQuestion(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.cxmQuestion.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.cxmQuestion.create({ data: { tenantId: actor.tenantId, surveyId: dto.surveyId as string, content: dto.content as string, questionType: (dto.questionType as string) ?? 'single', position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteQuestion(id: string, actor: RequestUser) {
    await this.prisma.cxmQuestion.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async upsertOption(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.cxmOption.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.cxmOption.create({ data: { tenantId: actor.tenantId, questionId: dto.questionId as string, content: dto.content as string, position: (dto.position as number) ?? 0, score: dto.score as number | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteOption(id: string, actor: RequestUser) {
    await this.prisma.cxmOption.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }
}
