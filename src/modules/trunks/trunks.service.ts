import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trunk, TrunkStatus } from './entities/trunk.entity';
import { CreateTrunkDto } from './dto/create-trunk.dto';
import { UpdateTrunkDto } from './dto/update-trunk.dto';

@Injectable()
export class TrunksService {
  constructor(
    @InjectRepository(Trunk)
    private readonly trunkRepository: Repository<Trunk>,
  ) {}

  async create(createTrunkDto: CreateTrunkDto): Promise<Trunk> {
    const existingTrunk = await this.trunkRepository.findOne({
      where: { name: createTrunkDto.name },
    });

    if (existingTrunk) {
      throw new ConflictException('Trunk name already exists');
    }

    const trunk = this.trunkRepository.create(createTrunkDto);
    return await this.trunkRepository.save(trunk);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: TrunkStatus;
  }): Promise<{ data: Trunk[]; total: number }> {
    const { page = 1, limit = 50, status } = params;

    const query = this.trunkRepository
      .createQueryBuilder('trunk')
      .where('trunk.deletedAt IS NULL');

    if (status) {
      query.andWhere('trunk.status = :status', { status });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Trunk> {
    const trunk = await this.trunkRepository.findOne({ where: { id } });

    if (!trunk) {
      throw new NotFoundException('Trunk not found');
    }

    return trunk;
  }

  async update(id: string, updateTrunkDto: UpdateTrunkDto): Promise<Trunk> {
    const trunk = await this.findOne(id);
    Object.assign(trunk, updateTrunkDto);
    return await this.trunkRepository.save(trunk);
  }

  async remove(id: string): Promise<void> {
    const trunk = await this.findOne(id);
    await this.trunkRepository.softDelete(trunk.id);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const trunk = await this.findOne(id);
    // TODO: Implement actual SIP OPTIONS or REGISTER test
    return {
      success: true,
      message: 'Connection test not yet implemented',
      latencyMs: 0,
    };
  }
}
