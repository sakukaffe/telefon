import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Extension, ExtensionStatus } from './entities/extension.entity';
import { ExtensionRegistration } from './entities/extension-registration.entity';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import * as crypto from 'crypto';

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(ExtensionRegistration)
    private readonly registrationRepository: Repository<ExtensionRegistration>,
  ) {}

  async create(createExtensionDto: CreateExtensionDto): Promise<Extension> {
    // Check if number already exists
    const existingExtension = await this.extensionRepository.findOne({
      where: { number: createExtensionDto.number },
    });

    if (existingExtension) {
      throw new ConflictException('Extension number already exists');
    }

    // Generate SIP password if not provided
    const sipPassword =
      createExtensionDto.sipPassword ||
      crypto.randomBytes(16).toString('hex');

    const extension = this.extensionRepository.create({
      ...createExtensionDto,
      sipPassword,
    });

    return await this.extensionRepository.save(extension);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: ExtensionStatus;
    search?: string;
  }): Promise<{ data: Extension[]; total: number }> {
    const { page = 1, limit = 50, status, search } = params;

    const query = this.extensionRepository
      .createQueryBuilder('extension')
      .leftJoinAndSelect('extension.user', 'user')
      .leftJoinAndSelect('extension.registrations', 'registration')
      .where('extension.deletedAt IS NULL');

    if (status) {
      query.andWhere('extension.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(extension.number ILIKE :search OR extension.displayName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Only show active registrations
    query.andWhere(
      '(registration.expiresAt > :now OR registration.expiresAt IS NULL)',
      { now: new Date() },
    );

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Extension> {
    const extension = await this.extensionRepository.findOne({
      where: { id },
      relations: ['user', 'registrations'],
    });

    if (!extension) {
      throw new NotFoundException('Extension not found');
    }

    return extension;
  }

  async findByNumber(number: string): Promise<Extension | null> {
    return await this.extensionRepository.findOne({ where: { number } });
  }

  async update(
    id: string,
    updateExtensionDto: UpdateExtensionDto,
  ): Promise<Extension> {
    const extension = await this.findOne(id);
    Object.assign(extension, updateExtensionDto);
    return await this.extensionRepository.save(extension);
  }

  async remove(id: string): Promise<void> {
    const extension = await this.findOne(id);
    await this.extensionRepository.softDelete(extension.id);
  }

  async registerExtension(
    extensionId: string,
    contactUri: string,
    ipAddress: string,
    port: number,
    transport: any,
    userAgent?: string,
    expiresIn: number = 3600,
  ): Promise<ExtensionRegistration> {
    // Remove existing registrations for this extension
    await this.registrationRepository.delete({ extensionId });

    const registration = this.registrationRepository.create({
      extensionId,
      contactUri,
      ipAddress,
      port,
      transport,
      userAgent,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return await this.registrationRepository.save(registration);
  }

  async unregisterExtension(extensionId: string): Promise<void> {
    await this.registrationRepository.delete({ extensionId });
  }

  async getRegistrations(extensionId: string): Promise<ExtensionRegistration[]> {
    return await this.registrationRepository.find({
      where: {
        extensionId,
        expiresAt: LessThan(new Date()),
      },
    });
  }

  async cleanupExpiredRegistrations(): Promise<void> {
    await this.registrationRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
