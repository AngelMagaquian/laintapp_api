import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../schemas/logger.schema';
import { GetLogsDto } from './dto/get-logs.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class LoggerService {
  constructor(
    @InjectModel(Logger.name) private loggerModel: Model<Logger>
  ) {}

  async createLog(userId: string, status: 'success' | 'error' | 'info' | 'warning', description: string = '') {
    try {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);

      const log = new this.loggerModel({
        user: userId,
        status,
        description,
        exp_date: expDate
      });
      return await log.save();
    } catch (error) {
      throw new Error('Error al crear el log');
    }
  }

  private async transformLog(log: any) {
    const logObj = log.toObject();
    if (logObj.user === 'system') {
      return {
        ...logObj,
        user: { username: 'system', email: 'system' }
      };
    }
    const populatedLog = await this.loggerModel.findById(log._id)
      .populate('user', 'username email')
      .exec();
    return {
      ...logObj,
      user: populatedLog.user
    };
  }

  async getLogs(filters: GetLogsDto) {
    try {
      const { page = 0, limit = 10, search, status, fromDate, toDate } = filters;
      const skip = page * limit;

      // Construir el filtro
      const filter: any = {};

      if (search) {
        filter.description = { $regex: search, $options: 'i' };
      }

      if (status) {
        filter.status = status;
      }

      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) {
          filter.createdAt.$gte = fromDate;
        }
        if (toDate) {
          filter.createdAt.$lte = toDate;
        }
      }

      // Obtener los logs con paginación
      const [logs, total] = await Promise.all([
        this.loggerModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.loggerModel.countDocuments(filter)
      ]);

      // Transformar los logs
      const transformedLogs = await Promise.all(logs.map(log => this.transformLog(log)));

      return {
        logs: transformedLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error('Error al obtener los logs');
    }
  }

  async getLogsByUser(userId: string, pagination: PaginationDto) {
    try {
      const { page = 0, limit = 10 } = pagination;
      const skip = page * limit;

      const [logs, total] = await Promise.all([
        this.loggerModel
          .find({ user: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.loggerModel.countDocuments({ user: userId })
      ]);

      // Transformar los logs
      const transformedLogs = await Promise.all(logs.map(log => this.transformLog(log)));

      return {
        logs: transformedLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error('Error al obtener los logs por usuario');
    }
  }
}
