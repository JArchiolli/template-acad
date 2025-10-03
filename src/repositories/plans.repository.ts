import { Injectable } from '@nestjs/common';
import { Plan, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class PlansRepository extends BaseRepository<Plan> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate() {
    return this.prisma.plan;
  }

  async findByAcademy(academyId: string): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: {
        academyId,
        deletedAt: null,
      },
      orderBy: {
        price: 'asc',
      },
    });
  }

  async findActivePlans(academyId: string): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: {
        academyId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: {
        price: 'asc',
      },
    });
  }

  async createPlan(data: Prisma.PlanCreateInput): Promise<Plan> {
    return this.prisma.plan.create({
      data,
    });
  }

  async updatePlan(id: string, data: Prisma.PlanUpdateInput): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }
}
