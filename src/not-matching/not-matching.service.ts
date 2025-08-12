import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
}
