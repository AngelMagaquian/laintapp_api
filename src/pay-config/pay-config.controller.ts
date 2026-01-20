import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { PayConfigService } from './pay-config.service';
import { CreatePayConfigDto } from './dto/create-pay-config.dto';
import { CreateDateRangeConfigDto } from './dto/create-date-range-config.dto';
import { UpdateDateRangeConfigDto } from './dto/update-date-range-config.dto';

@Controller('pay-config')
export class PayConfigController {
    constructor(private readonly payConfigService: PayConfigService) { }

    @Post()
    create(@Body() createPayConfigDto: CreatePayConfigDto) {
        return this.payConfigService.create(createPayConfigDto);
    }

    @Get()
    findAll() {
        return this.payConfigService.findAll();
    }

    @Post('date-range')
    createDateRange(@Body() createDateRangeDto: CreateDateRangeConfigDto) {
        return this.payConfigService.createDateRange(createDateRangeDto);
    }

    @Put('date-range/:id')
    updateDateRange(@Param('id') id: string, @Body() updateDateRangeDto: UpdateDateRangeConfigDto) {
        return this.payConfigService.updateDateRange(id, updateDateRangeDto);
    }

    @Get('date-range')
    findAllDateRanges() {
        return this.payConfigService.findAllDateRanges();
    }

    @Get('name/:name')
    findByName(@Param('name') name: string) {
        return this.payConfigService.findByName(name);
    }
}
