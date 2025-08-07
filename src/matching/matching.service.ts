import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MatchLevel, MatchResult, MatchStatus } from './dto/matching-file';
import { MatchingResponseDto } from './dto/matching-response.dto';
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

        const modo_types = ['PERSONAL_PAY', 'MODO', 'UALA']
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
                }else if(providerItem.proveedor === 'nave'){
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

    private levelWeight(level: MatchResult['matchLevel']): number {
        return { green: 3, yellow: 2, orange: 1, red: 0 }[level];
    }

    private compareAmount(xrp: any, provider: any): boolean {
        return Number(xrp.amount) == Number(provider.amount);
    }

    private compareStringValues(xrp: any, provider: any, field: string): boolean {
        return String(xrp[field]).trim().toLowerCase() == String(provider[field]).trim().toLowerCase();
    }

    async saveMatchingResults(matchingResults: MatchResult[]): Promise<any> {
        console.log({ matchingResults });
        try {
            const transformedResults = matchingResults.map(result => ({
                xrp: result.xrp,
                provider: result.provider,
                matchLevel: result.matchLevel,
                matchedFields: result.matchedFields,
                status: result.status,
                provider_name: result.provider?.proveedor || result.provider?.provider || 'unknown',
                transaction_id: result.provider?.transaction_id || result.xrp?.posnet?.toString() || 'unknown',
                reviewedBy: result.reviewedBy ? new Types.ObjectId(result.reviewedBy) : undefined,
                file_date: result.file_date ? new Date(result.file_date) : undefined,
                transaction_type: result.transaction_type
            }));

            const res = await this.matchingModel.insertMany(transformedResults);
            return res;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async saveNotMatchingResults(notMatchingProviders: any[]): Promise<any> {
        console.log(notMatchingProviders);
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

