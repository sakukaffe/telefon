import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrMenu } from './entities/ivr-menu.entity';
import { IvrMenuOption } from './entities/ivr-menu-option.entity';

export interface CreateIvrMenuDto {
  name: string;
  welcomePromptId?: string;
  digitTimeoutSeconds?: number;
  maxRetries?: number;
  options?: Array<{
    dtmfDigit: string;
    action: string;
    destinationId?: string;
    destinationNumber?: string;
  }>;
}

@Injectable()
export class IvrService {
  constructor(
    @InjectRepository(IvrMenu)
    private readonly ivrMenuRepository: Repository<IvrMenu>,
    @InjectRepository(IvrMenuOption)
    private readonly ivrMenuOptionRepository: Repository<IvrMenuOption>,
  ) {}

  async create(createDto: CreateIvrMenuDto): Promise<IvrMenu> {
    const existing = await this.ivrMenuRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('IVR menu name already exists');
    }

    const menu = this.ivrMenuRepository.create(createDto);
    const savedMenu = await this.ivrMenuRepository.save(menu);

    if (createDto.options && createDto.options.length > 0) {
      for (const option of createDto.options) {
        const menuOption = this.ivrMenuOptionRepository.create({
          ...option,
          ivrMenuId: savedMenu.id,
        });
        await this.ivrMenuOptionRepository.save(menuOption);
      }
    }

    return await this.findOne(savedMenu.id);
  }

  async findAll(): Promise<IvrMenu[]> {
    return await this.ivrMenuRepository.find({
      relations: ['options'],
      where: { deletedAt: null },
    });
  }

  async findOne(id: string): Promise<IvrMenu> {
    const menu = await this.ivrMenuRepository.findOne({
      where: { id },
      relations: ['options'],
    });

    if (!menu) {
      throw new NotFoundException('IVR menu not found');
    }

    return menu;
  }

  async update(id: string, updateDto: Partial<CreateIvrMenuDto>): Promise<IvrMenu> {
    const menu = await this.findOne(id);
    Object.assign(menu, updateDto);
    return await this.ivrMenuRepository.save(menu);
  }

  async remove(id: string): Promise<void> {
    const menu = await this.findOne(id);
    await this.ivrMenuRepository.softDelete(menu.id);
  }
}
