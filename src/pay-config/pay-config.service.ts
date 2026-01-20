import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaySimulationConfig } from '../schemas/paySimulationConfig.schema';
import { DateRangeConfig } from '../schemas/dateRangeConfig.schema';
import { CreatePayConfigDto } from './dto/create-pay-config.dto';
import { CreateDateRangeConfigDto } from './dto/create-date-range-config.dto';
import { UpdateDateRangeConfigDto } from './dto/update-date-range-config.dto';

@Injectable()
export class PayConfigService {
    constructor(
        @InjectModel(PaySimulationConfig.name) private payConfigModel: Model<PaySimulationConfig>,
        @InjectModel(DateRangeConfig.name) private dateRangeConfigModel: Model<DateRangeConfig>,
    ) { }

    async create(createPayConfigDto: CreatePayConfigDto): Promise<PaySimulationConfig> {
        const createdConfig = new this.payConfigModel(createPayConfigDto);
        return createdConfig.save();
    }

    async findAll(): Promise<PaySimulationConfig[]> {
        return this.payConfigModel.find().exec();
    }

    async findByName(name: string): Promise<PaySimulationConfig> {
        const config = await this.payConfigModel.findOne({ config_name: name }).exec();
        if (!config) {
            throw new NotFoundException(`Pay config with name "${name}" not found`);
        }
        return config;
    }

    async createDateRange(createDateRangeDto: CreateDateRangeConfigDto): Promise<DateRangeConfig> {
        const startDate = new Date(createDateRangeDto.startDate);
        const endDate = new Date(createDateRangeDto.endDate);

        // Format: "Name - D/M/YYYY - D/M/YYYY"
        const formattedStartDate = startDate.toLocaleDateString('es-ES');
        const formattedEndDate = endDate.toLocaleDateString('es-ES');

        const finalName = `${createDateRangeDto.name} - ${formattedStartDate} - ${formattedEndDate}`;

        const existingConfig = await this.dateRangeConfigModel.findOne({ name: finalName }).exec();
        if (existingConfig) {
            throw new BadRequestException(`Ya existe una configuración con el nombre "${finalName}"`);
        }

        const createdConfig = new this.dateRangeConfigModel({
            ...createDateRangeDto,
            name: finalName
        });
        return createdConfig.save();
    }

    async updateDateRange(id: string, updateDateRangeDto: UpdateDateRangeConfigDto): Promise<DateRangeConfig> {
        const config = await this.dateRangeConfigModel.findById(id);
        if (!config) {
            throw new NotFoundException(`Date range config with id "${id}" not found`);
        }

        // Only update details where allowed (this logic could be refined but dto handles validation structure)
        // We are replacing the whole details array as per DTO structure? 
        // Or should we patch specific days? The user said "update values of the record". 
        // Sending the full array of details is the easiest way to ensure consistency.

        config.details = updateDateRangeDto.details;

        return config.save();
    }

    async findAllDateRanges(): Promise<DateRangeConfig[]> {
        return this.dateRangeConfigModel.find().exec();
    }
}
