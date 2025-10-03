import { Injectable } from '@nestjs/common';
import { Academy, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class AcademiesRepository extends BaseRepository<Academy> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate() {
    return this.prisma.academy;
  }

  async findBySlug(slug: string): Promise<Academy | null> {
    return this.prisma.academy.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });
  }

  async findActiveAcademies(): Promise<Academy[]> {
    return this.prisma.academy.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async searchByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
  ): Promise<Academy[]> {
    const latDelta = radiusKm / 111; 
    const lonDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

    return this.prisma.academy.findMany({
      where: {
        deletedAt: null,
        latitude: {
          gte: latitude - latDelta,
          lte: latitude + latDelta,
        },
        longitude: {
          gte: longitude - lonDelta,
          lte: longitude + lonDelta,
        },
      },
    });
  }

  async createAcademy(data: Prisma.AcademyCreateInput): Promise<Academy> {
    return this.prisma.academy.create({
      data,
    });
  }

  async updateAcademy(id: string, data: Prisma.AcademyUpdateInput): Promise<Academy> {
    return this.prisma.academy.update({
      where: { id },
      data,
    });
  }
}
