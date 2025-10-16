import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { MatchLevel, MatchResult, MatchStatus } from './dto/matching-file';
import { MatchingResponseDto, FormattedMatchingDto } from './dto/matching-response.dto';
import { Matching } from '../schemas/matching.schema';
// import { NotMatching } from '../schemas/notMatching.schema';

@Injectable()
export class MatchingService {
    constructor(
        @InjectModel(Matching.name) private matchingModel: Model<Matching>
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
                //sacar a futuro cuando se corrijan el tpv de mercado pago
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

    async getMatchingResults(startDate: Date | string, endDate: Date | string, provider: string, status: string): Promise<FormattedMatchingDto[]> {
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
            
            // Construir el filtro base con fechas (si es settled usar payrollDate)
            const filter: any = {};
            const dateField = status === 'settled' ? 'payrollDate' : 'file_date';
            filter[dateField] = {
                $gte: startOfRange,
                $lte: endOfRange
            };
            if (status && status !== 'all') {
                filter.status = status;
            }

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
                matchLevel: record.matchLevel,
                estimated_net: record.estimated_net,
                estimated_payrollDate: record.estimated_payrollDate,
                payrollDate: record.payrollDate,
                amount_net: record.amount_net,
            }));
            
            return formattedResults;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private formatData(data: any): FormattedMatchingDto {
        const estimatedNetFromOriginal = data.provider?.original_data?.neto;
        const estimatedPayrollStr = data.provider?.original_data?.fecha_acreditacion || data.estimated_payrollDate;
        const estimatedNetInput = data.estimated_net ?? data.provider?.amount_net;

        const parseNumber = (val: any): number | undefined => {
            if (val === null || val === undefined) return undefined;
            const n = typeof val === 'string' ? Number(val.replace(',', '.')) : Number(val);
            return Number.isNaN(n) ? undefined : n;
        };

        const parseDateDDMMYYYY = (str: string): Date | undefined => {
            if (!str || typeof str !== 'string') return undefined;
            const onlyDate = str.split(' ')[0];
            const parts = onlyDate.includes('/') ? onlyDate.split('/') : [];
            if (parts.length !== 3) {
                const d = new Date(str);
                return Number.isNaN(d.getTime()) ? undefined : d;
            }
            const [dd, mm, yyyy] = parts;
            const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`;
            const d = new Date(iso);
            return Number.isNaN(d.getTime()) ? undefined : d;
        };

        const estimated_net = parseNumber(estimatedNetFromOriginal) ?? parseNumber(estimatedNetInput);
        const estimated_payrollDate = parseDateDDMMYYYY(estimatedPayrollStr);

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
            sucursal: (data.xrp?.sucursal || data?.sucursal)?.trim() || null,
            matchedFields: data.matchedFields || [],
            matchLevel: data.matchLevel,
            estimated_net,
            estimated_payrollDate,
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
                    transaction_type: result.transaction_type,
                    estimated_net: result.estimated_net,
                    estimated_payrollDate: result.estimated_payrollDate
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
                    matchLevel: formattedData.matchLevel,
                    estimated_net: formattedData.estimated_net,
                    estimated_payrollDate: formattedData.estimated_payrollDate
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


    private async findPayrollByIdAndProvider(provider: string, transaction_id: string): Promise<any> {
        try {
            const res = await this.matchingModel.find({ provider: provider, transaction_id: transaction_id.trim(), status: MatchStatus.APPROVED });
            return res;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async processFiservPayrollMatching(data: any): Promise<any> {
        try {
            const finded: any[] = [];
            const notFinded: any[] = [];

            for (const item of data) {
                let payrollDate = item.payroll_date;
                let amount_net = item.total_net;
                let type = item.type;
                if (type === 'Visa Crédito') {
                    type = 'VISA';
                }else if(type === 'Mastercard Crédito'){
                    type = 'MASTERCARD';
                }else if(type === 'Mastercard Debit'){
                    type = 'MASTERCARD';
                }else if(type === 'Visa Débito'){
                    type = 'VISA DEBITO';
                }

                for (const subItem of item.pays) {
                    console.log(payrollDate, amount_net, type);
                    
                    // Buscar registros de matching con status approved y provider fiserv
                    const matchingQuery = await this.findFiservApprovedMatching({
                        card_type: type,
                        tpv: item.tpv,
                        lote: item.lote,
                        cupon: item.cupon,
                        file_date: item.file_date
                    });

                    console.log('Matching encontrados:', matchingQuery);
                    
                    if (matchingQuery && matchingQuery.length > 0) {
                        // Si se encuentra coincidencia, actualizar el registro
                        const updatedRecord = await this.processFiservPayrollMatchingUpdate(
                            matchingQuery[0]._id, 
                            payrollDate, 
                            amount_net
                        );
                        console.log('Registro actualizado:', updatedRecord);
                        finded.push(updatedRecord);
                    } else {
                        // Si no se encuentra coincidencia, agregar a notFinded
                        notFinded.push({
                            ...subItem,
                            card_type: type,
                            tpv: item.tpv,
                            lote: item.lote,
                            cupon: item.cupon,
                            file_date: item.file_date,
                            payroll_date: payrollDate,
                            total_net: amount_net
                        });
                    }
                }
            }

            return { finded, notFinded };
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private async findFiservApprovedMatching(filters: {
        card_type: string;
        tpv: string;
        lote: string;
        cupon: string;
        file_date: string;
    }): Promise<any[]> {
        try {
            // Convertir la fecha del formato '2025-08-05' a Date para comparar con MongoDB
            const fileDate = new Date(filters.file_date + 'T00:00:00.000Z');
            
            const query = {
                status: MatchStatus.APPROVED,
                provider: 'fiserv',
                card_type: filters.card_type,
                tpv: filters.tpv,
                lote: filters.lote,
                cupon: filters.cupon,
                file_date: fileDate
            };

            console.log('Query de búsqueda:', query);
            
            const results = await this.matchingModel.find(query);
            return results;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private async processFiservPayrollMatchingUpdate(_id: ObjectId, payrollDate: Date, amount_net: number): Promise<any> {
        try {
            const updated = await this.matchingModel.findByIdAndUpdate(
                _id,
                { 
                    $set: { 
                        payrollDate: new Date(payrollDate), 
                        amount_net: Number(amount_net), 
                        status: MatchStatus.SETTLED 
                    } 
                },
                { new: true }
            );
            return updated;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }
    private async processPayrollMatching(_id: ObjectId, payrollDate: Date, amount_net: number): Promise<any> {
        try {
            const updated = await this.matchingModel.findByIdAndUpdate(
                _id,
                { 
                    $set: { 
                        payrollDate: new Date(payrollDate), 
                        amount_net: Number(amount_net), 
                        status: MatchStatus.SETTLED 
                    } 
                },
                { new: true }
            );
            return updated;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }
    async processNaranjaPayrollMatching(data: any[]): Promise<any> {
        try {
            const finded: any[] = [];
            const notFinded: any[] = [];

            for (const item of data) {
                console.log('Procesando item Naranja:', item);
                
                // Buscar registros de matching con status approved y provider naranja
                const matchingQuery = await this.findNaranjaApprovedMatching({
                    file_date: item.file_date,
                    tpv: item.tpv,
                    lote: item.lote,
                    cupon: item.cupon
                });

                console.log('Matching encontrados:', matchingQuery);
                
                if (matchingQuery && matchingQuery.length > 0) {
                    // Si se encuentra coincidencia, actualizar el registro
                    const updatedRecord = await this.processNaranjaPayrollMatchingUpdate(
                        matchingQuery[0]._id, 
                        item.payroll_date, 
                        item.amount_net
                    );
                    console.log('Registro actualizado:', updatedRecord);
                    finded.push(updatedRecord);
                } else {
                    // Si no se encuentra coincidencia, agregar a notFinded
                    notFinded.push(item);
                }
            }

            return { finded, notFinded };
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private async findNaranjaApprovedMatching(filters: {
        file_date: string;
        tpv: string;
        lote: string;
        cupon: string;
    }): Promise<any[]> {
        try {
            // Convertir la fecha del formato '2025-08-31' a Date para comparar con MongoDB
            const fileDate = new Date(filters.file_date + 'T00:00:00.000Z');
            
            const query = {
                status: MatchStatus.APPROVED,
                provider: 'naranja',
                file_date: fileDate,
                tpv: filters.tpv,
                lote: filters.lote,
                cupon: filters.cupon
            };

            console.log('Query de búsqueda Naranja:', query);
            
            const results = await this.matchingModel.find(query);
            return results;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private async processNaranjaPayrollMatchingUpdate(_id: ObjectId, payrollDate: Date, amount_net: number): Promise<any> {
        try {
            const updated = await this.matchingModel.findByIdAndUpdate(
                _id,
                { 
                    $set: { 
                        payrollDate: new Date(payrollDate), 
                        amount_net: Number(amount_net), 
                        status: MatchStatus.SETTLED 
                    } 
                },
                { new: true }
            );
            return updated;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async getPayrollMatching(provider: string, data: any[]): Promise<any> {
        try {
            if (!provider || !Array.isArray(data)) {
                throw new BadRequestException('Payload inválido: provider o data');
            }
            const finded: any[] = [];
            const notFinded: any[] = [];

            for (const item of data) {
                const operacion = item.transaction_id;
                let docs: any[] = [];
                if (!operacion || typeof operacion !== 'string') {
                    notFinded.push(item);
                    continue;
                }
                if(provider === 'nave' || provider === 'mercado_pago'){
                    docs = await this.findPayrollByIdAndProvider(provider, operacion);
                }
                if (docs && docs.length > 0) {
                    
                    const newData = await this.processPayrollMatching(docs[0]._id, item.payroll_date, item.amount_net);
                    console.log(newData);
                    finded.push(newData);
                } else {
                    notFinded.push(item);
                }
            }

            return { finded, notFinded };
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }


    // Métodos de NotMatching movidos a NotMatchingService
}

