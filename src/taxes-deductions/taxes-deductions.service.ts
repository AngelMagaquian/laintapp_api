import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaxesDeductions } from '../schemas/taxes_deductions.schema';

@Injectable()
export class TaxesDeductionsService {
    constructor(
        @InjectModel(TaxesDeductions.name) private taxesDeductionsModel: Model<TaxesDeductions>
    ) { }

    async saveGroupedDeductions(data: any[]): Promise<any> {
        try {
            if (!data || data.length === 0) {
                return [];
            }

            // The data coming from frontend has already been normalized, 
            // but we might need to map specific fields if missing or defaults.
            const formattedData = data.map(item => ({
                provider: item.provider,
                date: item.date ? new Date(item.date) : new Date(),
                costo_servicio: Number(item.costo_servicio || 0),
                iva: Number(item.iva || 0),
                iibb: Number(item.iibb || 0),
                descuentos_financieros: Number(item.descuentos_financieros || 0),
                imp_credito_debito: Number(item.imp_credito_debito || 0),
                per_iva: Number(item.per_iva || 0),
                otros_imp: Number(item.otros_imp || 0),
                otros_aran: Number(item.otros_aran || 0),
                count: Number(item.count || 1) // default count to 1 if not provided
            }));

            const res = await this.taxesDeductionsModel.insertMany(formattedData);
            return res;
        } catch (error) {
            console.error('Error saving grouped deductions:', error);
            throw error;
        }
    }

    async getTaxesDeductions(startDate: string, endDate: string, provider?: string): Promise<TaxesDeductions[]> {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Ajustar end date para incluir todo el día
        end.setUTCHours(23, 59, 59, 999);
        start.setUTCHours(0, 0, 0, 0);

        const filter: any = {
            date: {
                $gte: start,
                $lte: end,
            },
        };

        if (provider && provider !== 'all') {
            filter.provider = provider;
        }

        console.log('TaxesDeductions Filter:', filter);

        return this.taxesDeductionsModel.find(filter).sort({ date: 1 }).exec();
    }
}
