import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MatchLevel, MatchResult, MatchStatus } from './dto/matching-file';
import { MatchingResponseDto, FormattedMatchingDto } from './dto/matching-response.dto';
import { Matching } from '../schemas/matching.schema';
import { NotMatching } from '../schemas/notMatching.schema';

@Injectable()
export class MatchingService {
    constructor(
        @InjectModel(Matching.name) private matchingModel: Model<Matching>,
        @InjectModel(NotMatching.name) private notMatchingModel: Model<NotMatching>
    ) { }

    async matchingProcess(xrpArray: any[], providerArray: any[]): Promise<MatchingResponseDto> {

        console.log({ xrpArray: xrpArray[0] });
        console.log({ providerArray: providerArray[0] });

        const usedProviders = new Set();
        const matchingResults: MatchResult[] = [];
        const notMatchingXrpItems: any[] = [];

        const modo_types = ['PERSONAL_PAY', 'MODO', 'UALA', 'NARANJA', 'MERCADO PAGO']
        const res = xrpArray.map((xrpItem, index) => {
            let bestMatch: any = null;
            let bestLevel: MatchResult['matchLevel'] = MatchLevel.RED;
            let matchedFields: string[] = [];
            let bestMatchIndex: number = -1;
            for (let i = 0; i < providerArray.length; i++) {
                const providerItem = providerArray[i];
                const matchFields: string[] = [];
                let tpv = null;
                let tipoIgual = false;
                const montoIgual = this.compareAmount(xrpItem, providerItem);
                const cuponIgual = this.compareStringValues(xrpItem, providerItem, 'cupon');
                const loteIgual = this.compareStringValues(xrpItem, providerItem, 'lote');

                if(providerItem.proveedor === 'fiserv' && xrpItem.card_type === 'MODO'){
                    tipoIgual = modo_types.includes(xrpItem.card_type.toUpperCase()) ? true : false;
                }else if(providerItem.proveedor === 'nave' || providerItem.proveedor === 'naranja'){
                    tipoIgual = true
                }else{
                    tipoIgual = this.compareStringValues(xrpItem, providerItem, 'card_type');
                }
                if (providerItem.provider !== 'mercado_pago') {
                    tpv = this.compareStringValues(xrpItem,providerItem, 'tpv');
                }

                
                if (montoIgual) matchFields.push('monto');
                if (cuponIgual) matchFields.push('cupon');
                if (loteIgual) matchFields.push('lote');
                if (tipoIgual) matchFields.push('tipo');
                if (tpv) matchFields.push('tpv');

                let level: MatchResult['matchLevel'] = MatchLevel.RED;
                if (montoIgual && tipoIgual  && loteIgual && cuponIgual) level = MatchLevel.GREEN;
                else if (montoIgual && tipoIgual && tpv && matchFields.length >= 4) level = MatchLevel.YELLOW;
                else if (((cuponIgual || loteIgual || tipoIgual) && montoIgual) && matchFields.length >= 2) level = MatchLevel.ORANGE;

                if (this.levelWeight(level) > this.levelWeight(bestLevel)) {
                    bestMatch = providerItem;
                    bestLevel = level;
                    matchedFields = matchFields;
                    bestMatchIndex = i;
                }
            }

            // Marcar el proveedor como usado si hay un match
            if (bestMatchIndex !== -1) {
                usedProviders.add(bestMatchIndex);
            } else {
                // Si no hay match, agregar el item XRP a la lista de no matching
                notMatchingXrpItems.push({
                    original_data: xrpItem,
                    provider_name: 'xrp',
                    file_date: xrpItem.file_date ? new Date(xrpItem.file_date) : undefined,
                    transaction_type: xrpItem.transaction_type || 'unknown'
                });
            }

            const result: MatchResult = {
                id: index,
                xrp: xrpItem,
                provider: bestMatch,
                matchLevel: bestLevel,
                matchedFields,
                status: MatchStatus.PENDING,
                transaction_type: xrpItem.transaction_type || 'unknown'
            };

            matchingResults.push(result);
            return result;
        });

        // Obtener proveedores que no tuvieron match
        const notMatchingProviders = providerArray.filter((_, index) => !usedProviders.has(index));

        return {
            matchingValues: res,
            notMatching: notMatchingProviders
        };
    }

    async getMatchingResults(startDate: Date | string, endDate: Date | string, provider: string): Promise<FormattedMatchingDto[]> {
        try {
            // Convertir a Date si viene como string
            const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
            const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
            
            // Crear las fechas en formato ISO string usando UTC para evitar problemas de timezone
            const startYear = startDateObj.getUTCFullYear();
            const startMonth = String(startDateObj.getUTCMonth() + 1).padStart(2, '0');
            const startDay = String(startDateObj.getUTCDate()).padStart(2, '0');
            
            const endYear = endDateObj.getUTCFullYear();
            const endMonth = String(endDateObj.getUTCMonth() + 1).padStart(2, '0');
            const endDay = String(endDateObj.getUTCDate()).padStart(2, '0');
            
            const startOfRange = `${startYear}-${startMonth}-${startDay}T00:00:00Z`;
            const endOfRange = `${endYear}-${endMonth}-${endDay}T23:59:59Z`;
            
            console.log({startOfRange, endOfRange, provider});
            
            // Construir el filtro base con fechas
            const filter: any = {
                file_date: {
                    $gte: startOfRange,
                    $lte: endOfRange
                }
            };

            // Si el proveedor no es "all", agregar el filtro de proveedor
            if (provider !== 'all') {
                filter.provider = provider;
            }

            const res = await this.matchingModel.find(filter)
                .populate('reviewedBy', 'name lastname _id');

            // Los datos ya están en el formato correcto, solo necesitamos convertirlos
            const formattedResults = res.map(record => ({
                provider: record.provider,
                transaction_id: record.transaction_id,
                transaction_type: record.transaction_type,
                file_date: record.file_date,
                amount: record.amount,
                card_type: record.card_type,
                cupon: record.cupon,
                lote: record.lote,
                tpv: record.tpv,
                status: record.status,
                reviewedBy: record.reviewedBy,
                sucursal: record.sucursal,
                matchedFields: record.matchedFields,
                matchLevel: record.matchLevel
            }));
            
            return formattedResults;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private formatData(data: any): FormattedMatchingDto {
        const formatedData = {
            provider: data.provider_name,
            transaction_id: data.transaction_id || null,
            transaction_type: data.transaction_type,
            file_date: new Date(data.provider?.file_date || data.xrp?.file_date || data.file_date),
            amount: data.provider?.amount || data.xrp?.amount,
            card_type: data.provider?.card_type,
            cupon: data.provider?.cupon || data.xrp?.cupon,
            lote: data.provider?.lote || data.xrp?.lote,
            tpv: data.provider?.tpv,
            status: data.status,
            reviewedBy: data.reviewedBy,
            sucursal: data.xrp?.sucursal || data?.sucursal || null,
            matchedFields: data.matchedFields || [],
            matchLevel: data.matchLevel,
        }
        return formatedData;
    }
    private levelWeight(level: MatchResult['matchLevel']): number {
        return { green: 3, yellow: 2, orange: 1, red: 0 }[level];
    }

    private compareAmount(xrp: any, provider: any): boolean {
        return Number(xrp.amount) == Number(provider.amount);
    }

    private compareStringValues(xrp: any, provider: any, field: string): boolean {
        return String(xrp[field]).trim().toLowerCase() == String(provider[field]).trim().toLowerCase();
    }

    async saveMatchingResults(matchingResults: any[]): Promise<any> {
        try {
            const transformedResults = matchingResults.map(result => {
                // Formatear los datos usando formatData
                const formattedData = this.formatData({
                    ...result,
                    provider_name: result.provider_name,
                    transaction_id: result.provider?.transaction_id || result.xrp?.posnet?.toString() || 'unknown',
                    file_date: result.file_date ? new Date(result.file_date) : undefined,
                    transaction_type: result.transaction_type
                });

                return {
                    provider: formattedData.provider,
                    transaction_id: formattedData.transaction_id,
                    transaction_type: formattedData.transaction_type,
                    file_date: formattedData.file_date,
                    amount: formattedData.amount,
                    card_type: formattedData.card_type,
                    cupon: formattedData.cupon,
                    lote: formattedData.lote,
                    tpv: formattedData.tpv,
                    status: formattedData.status,
                    reviewedBy: result.reviewedBy ? new Types.ObjectId(result.reviewedBy) : undefined,
                    sucursal: formattedData.sucursal,
                    matchedFields: formattedData.matchedFields,
                    matchLevel: formattedData.matchLevel
                };
            });

            console.log(transformedResults[0]);
            const res = await this.matchingModel.insertMany(transformedResults);
            return res;
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
            // Convertir a Date si viene como string
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            
            // Crear las fechas en formato ISO string usando UTC para evitar problemas de timezone
            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            
            const startOfDay = `${year}-${month}-${day}T00:00:00Z`;
            const endOfDay = `${year}-${month}-${day}T23:59:59Z`;
            
            console.log({startOfDay, endOfDay});
            
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

