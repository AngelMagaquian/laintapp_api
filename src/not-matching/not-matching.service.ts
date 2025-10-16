import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotMatching } from 'src/schemas/notMatching.schema';

@Injectable()
export class NotMatchingService {
    constructor(
        @InjectModel(NotMatching.name) private notMatchingModel: Model<NotMatching>
    ) {}

    async getNotMatchingTotal(): Promise<any> {
        try {
            const total = await this.notMatchingModel.countDocuments();
            return total;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async getNotMatchingTotalByDates(): Promise<any> {
        try {
            const results = await this.notMatchingModel.aggregate([
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$file_date"
                            }
                        },
                        total: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: -1 }
                },
                {
                    $project: {
                        _id: 0,
                        date: "$_id",
                        total: 1
                    }
                }
            ]);
            
            return results;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async saveNotMatchingResults(notMatchingProviders: any[]): Promise<any> {
        try {
            const transformedResults = notMatchingProviders.map(provider => ({
                ...provider,
                original_data: provider.original_data,
                provider_name: provider.provider_name,
                file_date: provider.file_date ? new Date(provider.file_date) : undefined,
                transaction_type: provider.transaction_type || 'unknown'
            }));

            const res = await this.notMatchingModel.insertMany(transformedResults);
            return res;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async getNotMatchingResults(date: Date | string): Promise<any> {
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const startOfDay = `${year}-${month}-${day}T00:00:00Z`;
            const endOfDay = `${year}-${month}-${day}T23:59:59Z`;

            const res = await this.notMatchingModel.find({
                file_date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).populate('reviewedBy', 'name lastname _id');

            return res;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async deleteNotMatchingResults(_id: string): Promise<any> {
        try {
            const res = await this.notMatchingModel.deleteOne({_id: new Types.ObjectId(_id)});
            return res;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }
}
