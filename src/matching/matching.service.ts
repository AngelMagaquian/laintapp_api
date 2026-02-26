import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { MatchLevel, MatchResult, MatchStatus } from './dto/matching-file';
import { MatchingResponseDto, FormattedMatchingDto } from './dto/matching-response.dto';
import { Matching } from '../schemas/matching.schema';
import { TaxesDeductions } from '../schemas/taxes_deductions.schema';
// import { NotMatching } from '../schemas/notMatching.schema';

@Injectable()
export class MatchingService {
    constructor(
        @InjectModel(Matching.name) private matchingModel: Model<Matching>,
        @InjectModel(TaxesDeductions.name) private taxesDeductionsModel: Model<TaxesDeductions>
    ) { }

    async matchingProcess(xrpArray: any[], providerArray: any[]): Promise<MatchingResponseDto> {

        console.log({ xrpArray: xrpArray[0] });
        console.log({ providerArray: providerArray[0] });

        const usedProviders = new Set();
        const matchingResults: MatchResult[] = [];
        const notMatchingXrpItems: any[] = [];

        const modo_types = ['PERSONAL_PAY', 'MODO', 'UALA', 'NARANJA', 'MERCADO PAGO', 'GENERAL']
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

                if (providerItem.proveedor === 'fiserv' && xrpItem.card_type === 'MODO') {
                    tipoIgual = modo_types.includes(xrpItem.card_type.toUpperCase()) ? true : false;
                } else if (providerItem.proveedor === 'fiserv') {
                    tipoIgual = true
                }
                else if (providerItem.proveedor === 'nave' || providerItem.proveedor === 'naranja') {
                    tipoIgual = true
                } else {
                    tipoIgual = this.compareStringValues(xrpItem, providerItem, 'card_type');
                }
                //sacar a futuro cuando se corrijan el tpv de mercado pago
                if (providerItem.provider !== 'mercado_pago') {
                    tpv = this.compareStringValues(xrpItem, providerItem, 'tpv');
                }


                if (montoIgual) matchFields.push('monto');
                if (cuponIgual) matchFields.push('cupon');
                if (loteIgual) matchFields.push('lote');
                if (tipoIgual) matchFields.push('tipo');
                if (tpv) matchFields.push('tpv');

                let level: MatchResult['matchLevel'] = MatchLevel.RED;
                if (montoIgual && tipoIgual && loteIgual && cuponIgual) level = MatchLevel.GREEN;
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

    async getMatchingResults(startDate: Date | string, endDate: Date | string, provider: string, status: string, dateKey: string): Promise<FormattedMatchingDto[]> {
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

            console.log({ startOfRange, endOfRange, provider });

            // Construir el filtro base con fechas (si es settled usar payrollDate)
            const filter: any = {};
            // const dateField = status === 'settled' ? 'payrollDate' : 'file_date';
            filter[dateKey] = {
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
                _id: record._id,
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
        console.log({ provider, transaction_id })

        try {
            const res = await this.matchingModel.find({ provider: provider, transaction_id: transaction_id.trim(), status: MatchStatus.APPROVED });
            return res;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    async processFiservPayrollMatching(data: any): Promise<any> {

        console.log({ data });
        try {
            const finded: any[] = [];
            const notFinded: any[] = [];

            for (const item of data) {
                let payrollDate = item.payroll_date;
                let amount_net = item.total_net;
                let type = item.type;
                if (type === 'Visa Crédito') {
                    type = 'VISA';
                } else if (type === 'Mastercard Crédito') {
                    type = 'MASTERCARD';
                } else if (type === 'Mastercard Debit') {
                    type = 'Master Debit';
                } else if (type === 'Visa Débito') {
                    type = 'VISA DEBITO';
                }

                for (const subItem of item.pays) {

                    const matchingQuery = await this.findFiservApprovedMatching({
                        card_type: type,
                        tpv: subItem.tpv,
                        lote: subItem.lote,
                        cupon: subItem.cupon,
                        file_date: subItem.file_date,
                        amount: subItem.amount
                    });

                    console.log('Matching encontrados:', matchingQuery);

                    if (matchingQuery && matchingQuery.length > 0) {
                        // Si se encuentra coincidencia, actualizar el registro
                        const updatedRecord = await this.processFiservPayrollMatchingUpdate(
                            matchingQuery[0]._id,
                            payrollDate,
                            matchingQuery[0].estimated_net
                        );
                        console.log('Registro actualizado:', updatedRecord);
                        finded.push(updatedRecord);
                    } else {
                        // Si no se encuentra coincidencia, agregar a notFinded
                        notFinded.push({
                            ...subItem,
                            card_type: type,
                            tpv: subItem.tpv,
                            lote: subItem.lote,
                            cupon: subItem.cupon,
                            file_date: subItem.file_date,
                            payroll_date: payrollDate,
                            total_net: subItem.amount
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
        amount: number;
        card_type: string;
        tpv: string;
        lote: string;
        cupon: string;
        file_date: string | null | undefined;
    }): Promise<any[]> {
        try {
            const query: any = {
                status: MatchStatus.APPROVED,
                provider: 'fiserv',
                card_type: filters.card_type,
                lote: filters.lote,
                cupon: filters.cupon,
                amount: filters.amount
            };

            /* 
             if (filters.file_date) {
                 const fileDateObj = typeof filters.file_date === 'string' ? new Date(filters.file_date) : filters.file_date;
                 
              
                 if (!isNaN(fileDateObj.getTime())) {
                
                     const year = fileDateObj.getUTCFullYear();
                     const month = fileDateObj.getUTCMonth();
                     const day = fileDateObj.getUTCDate();
                     
                 
                     const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
                     const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
                     
                     query.file_date = {
                         $gte: startOfDay,
                         $lte: endOfDay
                     };
                 }
             } */



            console.log('Fiserv query completa:', JSON.stringify(query, null, 2));

            // Log adicional para debug: buscar sin file_date para ver si hay registros que coincidan con otros campos
            const queryWithoutDate = { ...query };
            delete queryWithoutDate.file_date;
            const resultsWithoutDate = await this.matchingModel.find(queryWithoutDate).limit(5);
            console.log('Fiserv resultados SIN file_date (primeros 5):', resultsWithoutDate.length);
            if (resultsWithoutDate.length > 0) {
                console.log('Ejemplo de file_date en BD:', resultsWithoutDate[0].file_date);
                console.log('Tipo de file_date en BD:', typeof resultsWithoutDate[0].file_date);
            }

            const results = await this.matchingModel.find(query);
            console.log('Fiserv resultados encontrados CON file_date:', results.length);
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
    async manualSettleMatching(recordId: string, settlementDate: string, netAmount: number): Promise<any> {
        try {
            const date = new Date(settlementDate);
            // Ajustar a UTC si es necesario, o asumir que viene como YYYY-MM-DD y crear fecha local/UTC
            // Para consistencia con el resto, creamos fecha UTC inicio del día
            const parts = settlementDate.split('-');
            const utcDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0));

            return await this.processPayrollMatching(new Types.ObjectId(recordId) as any, utcDate, netAmount);
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
    // 1. HELPER: Parseo de fecha específico para formato Naranja (DDMMAAAA o DD/MM/AAAA)
    private parseNaranjaDate(dateStr: string): Date {
        if (!dateStr) return new Date();
        const str = dateStr.toString().trim();

        // Si ya viene formateada (ISO), la devolvemos
        if (str.includes('-') && str.includes('T')) {
            return new Date(str);
        }

        // Formato con barras: 19/10/2025
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
            }
        }

        // Formato plano: 26092025 (8 dígitos) o 5102025 (7 dígitos - falta 0 inicial)
        let cleanStr = str;
        if (cleanStr.length === 7) {
            cleanStr = '0' + cleanStr;
        }

        if (cleanStr.length === 8 && !isNaN(Number(cleanStr))) {
            const day = cleanStr.substring(0, 2);
            const month = cleanStr.substring(2, 4);
            const year = cleanStr.substring(4, 8);
            return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        }

        return new Date(); // Fallback
    }

    // 2. HELPER: Parseo de montos (coma a punto)
    private parseAmount(amountStr: any): number {
        if (!amountStr) return 0;
        if (typeof amountStr === 'number') return amountStr;
        return parseFloat(amountStr.toString().replace(',', '.'));
    }

    async processNaranjaPayrollMatching(data: any[]): Promise<any> {
        try {
            const finded: any[] = [];
            const notFinded: any[] = [];

            for (const item of data) {
                try {
                    console.log('Procesando item Naranja:', item);

                    // FILTRO: Ignorar filas que no son ventas (Cabeceras, Impuestos, Totales)
                    // Si no tiene tarjeta ni cupón, no es una transacción individual macheable.
                    if (!item['Numero de tarjeta'] && !item['Cupon (Controlar)'] && !item['Nro. de Cupón']) {
                        continue;
                    }

                    const rawLote = item.lote || item.Lote || item['Nro. de Lote'];
                    const rawCupon = item.cupon || item['Cupon (Controlar)'] || item['Nro. de Cupón'];
                    const rawBruto = item.Bruto || item['Importe Bruto'] || item.amount;

                    if (!rawBruto || !rawLote || !rawCupon) {
                        console.warn('Item Naranja falta datos clave (amount, lote, cupon) - Posible registro no transaccional:', item);
                        notFinded.push({ ...item, error: 'Faltan datos clave o no es una transacción' });
                        continue;
                    }

                    const amountBruto = this.parseAmount(rawBruto);

                    const arancel = this.parseAmount(item['Calculo arancel'] || item['Arancel']);
                    const interes = this.parseAmount(item['Calculo interes'] || item['Interes']);
                    const amountNet = amountBruto - arancel - interes;


                    const rawDate = item.file_date || item['Fecha de Venta'];
                    const payrollDate = this.parseNaranjaDate(item['Fecha de cobro'] || item.payroll_date);

                    // Buscar match
                    const matchingQuery = await this.findNaranjaApprovedMatching({
                        file_date: rawDate,
                        tpv: item.tpv || item.Terminal || item['Nro. de Terminal'],
                        lote: rawLote,
                        cupon: rawCupon,
                        amount: amountBruto
                    });

                    console.log('Matching encontrados:', matchingQuery);

                    if (matchingQuery && matchingQuery.length > 0) {
                        // Si se encuentra coincidencia, actualizar el registro
                        const updatedRecord = await this.processNaranjaPayrollMatchingUpdate(
                            matchingQuery[0]._id,
                            payrollDate,
                            amountNet // Pasamos el neto calculado
                        );
                        console.log('Registro actualizado:', updatedRecord);
                        finded.push(updatedRecord);
                    } else {
                        // Si no se encuentra coincidencia, agregar a notFinded
                        notFinded.push(item);
                    }
                } catch (innerError) {
                    console.error('Error procesando item individual Naranja:', innerError, item);
                    notFinded.push({ ...item, error: innerError.message });
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
        amount: number;
    }): Promise<any[]> {
        try {
            console.log('findNaranjaApprovedMatching filters:', filters);

            // Corrección Crítica: Parseo de fecha usando el helper
            const fileDate = this.parseNaranjaDate(filters.file_date);

            // Rangos de fecha (Inicio y Fin del día)
            const startOfDay = new Date(fileDate);
            if (!isNaN(startOfDay.getTime())) startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(fileDate);
            if (!isNaN(endOfDay.getTime())) endOfDay.setUTCHours(23, 59, 59, 999);

            // Limpieza de Lote y Cupón (Regex para ignorar ceros izquierda)
            const cleanLote = filters.lote ? filters.lote.toString().trim().replace(/^0+/, '') : '';
            const cleanCupon = filters.cupon ? filters.cupon.toString().trim().replace(/^0+/, '') : '';

            const loteRegex = new RegExp(`^0*${cleanLote}$`);
            const cuponRegex = new RegExp(`^0*${cleanCupon}$`);

            // Intento 1: Búsqueda Estricta (Fecha + Monto + Lote + Cupón)
            const queryStrict: any = {
                status: MatchStatus.APPROVED, // Solo APPROVED
                provider: 'naranja',
                amount: filters.amount,
                lote: { $regex: loteRegex },
                cupon: { $regex: cuponRegex }
            };
            if (!isNaN(startOfDay.getTime())) {
                queryStrict.file_date = { $gte: startOfDay, $lte: endOfDay };
            }

            console.log('INTENTO 1 (Estricto):', JSON.stringify(queryStrict, null, 2));
            let results = await this.matchingModel.find(queryStrict);
            if (results.length > 0) return results;

            // Intento 2: Sin Fecha (A veces la fecha de venta difiere por horas/timezone)
            console.log('Intento 1 falló. Probando INTENTO 2 (Ignorar Fecha)...');
            const queryNoDate = {
                status: MatchStatus.APPROVED,
                provider: 'naranja',
                amount: filters.amount,
                lote: { $regex: loteRegex },
                cupon: { $regex: cuponRegex }
            };
            results = await this.matchingModel.find(queryNoDate);
            if (results.length > 0) {
                console.log(`¡Match encontrado en Intento 2! (${results.length} resultados)`);
                return results;
            }

            // Intento 3: Sin Monto (A veces hay diferencias de centavos)
            if (!isNaN(startOfDay.getTime())) {
                console.log('Intento 2 falló. Probando INTENTO 3 (Ignorar Monto)...');
                const queryNoAmount = {
                    status: MatchStatus.APPROVED,
                    provider: 'naranja',
                    file_date: { $gte: startOfDay, $lte: endOfDay },
                    lote: { $regex: loteRegex },
                    cupon: { $regex: cuponRegex }
                };
                results = await this.matchingModel.find(queryNoAmount);
                if (results.length > 0) {
                    console.log(`¡Match encontrado en Intento 3! (${results.length} resultados)`);
                    return results;
                }
            }

            console.log('No se encontraron coincidencias en ningún intento.');

            // CHECK: ¿Ya está liquidada?
            cupon: { $regex: cuponRegex }


            return [];

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

    async processModoPayrollMatching(data: any[]): Promise<any> {
        try {
            const finded: any[] = [];
            const notFinded: any[] = [];

            const settledItems: any[] = [];

            for (const item of data) {
                console.log('Procesando item MODO:', item);

                // Buscar registros de matching con status approved y provider modo
                const matchingQuery = await this.findModoApprovedMatching({
                    tpv: item.tpv,
                    lote: item.lote,
                    cupon: item.cupon,
                    amount: item.amount
                });

                console.log('Matching encontrados:', matchingQuery);

                if (matchingQuery && matchingQuery.length > 0) {
                    // Si se encuentra coincidencia, actualizar el registro
                    const updatedRecord = await this.processModoPayrollMatchingUpdate(
                        matchingQuery[0]._id,
                        item.payroll_date,
                        item.amount_net
                    );
                    console.log('Registro actualizado:', updatedRecord);
                    finded.push(updatedRecord);
                    settledItems.push(item);
                } else {
                    // Si no se encuentra coincidencia, agregar a notFinded
                    notFinded.push(item);
                }
            }

            this.groupAndSumSettled(settledItems, 'MODO');

            return { finded, notFinded };
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private async findModoApprovedMatching(filters: {
        tpv: string;
        lote: string;
        cupon: string;
        amount: number;
    }): Promise<any[]> {
        try {
            const query = {
                status: MatchStatus.APPROVED,
                provider: 'MODO',
                tpv: filters.tpv,
                lote: filters.lote,
                cupon: filters.cupon,
                amount: filters.amount
            };

            console.log('Query de búsqueda MODO:', query);

            const results = await this.matchingModel.find(query);
            console.log('MODO resultados encontrados:', results.length);
            return results;
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }

    private async processModoPayrollMatchingUpdate(_id: ObjectId, payrollDate: Date, amount_net: number): Promise<any> {
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

            const settledItems: any[] = [];

            for (const item of data) {
                const operacion = item.transaction_id;
                let docs: any[] = [];
                if (!operacion || typeof operacion !== 'string') {
                    notFinded.push(item);
                    continue;
                }

                if (provider.toLowerCase() === 'nave' || provider.toLowerCase() === 'mercado_pago' || provider.toLowerCase() === 'modo' || provider.toLowerCase() === 'cabal' || provider.toLowerCase() === 'amex') {
                    // console.log(provider)
                    docs = await this.findPayrollByIdAndProvider(provider, operacion);
                }
                if (docs && docs.length > 0) {

                    const newData = await this.processPayrollMatching(docs[0]._id, item.payroll_date, item.amount_net);
                    console.log(newData);
                    finded.push(newData);
                    // Agregar item original (con datos de impuestos) a la lista de liquidados para agrupar
                    settledItems.push(item);
                } else {
                    notFinded.push(item);
                }
            }

            // Llamar al agrupador al final
            this.groupAndSumSettled(settledItems, provider);

            return { finded, notFinded };
        } catch (error) {
            console.log({ error });
            throw error;
        }
    }


    // Métodos de NotMatching movidos a NotMatchingService

    private async groupAndSumSettled(settledItems: any[], providerName: string) {
        try {
            if (!settledItems || settledItems.length === 0) {
                console.log(`No hay items liquidados para agrupar de ${providerName}.`);
                return;
            }

            const groupedMap = new Map<string, any>();

            for (const item of settledItems) {
                // Clave de agrupamiento: Proveedor + Fecha (payroll_date)
                // Usamos payroll_date como fecha de liquidación
                const dateKey = item.payroll_date ? new Date(item.payroll_date).toISOString().split('T')[0] : 'unknown_date';
                const key = `${providerName}|${dateKey}`;

                if (!groupedMap.has(key)) {
                    groupedMap.set(key, {
                        provider: providerName,
                        date: dateKey,
                        costo_servicio: 0,
                        iva: 0,
                        iibb: 0,
                        descuentos_financieros: 0,
                        imp_credito_debito: 0,
                        per_iva: 0,
                        otros_imp: 0,
                        otros_aran: 0,
                        count: 0
                    });
                }

                const group = groupedMap.get(key);
                group.costo_servicio += Number(item.costo_servicio || 0);
                group.iva += Number(item.iva || 0);
                group.iibb += Number(item.iibb || 0);
                group.descuentos_financieros += Number(item.descuentos_financieros || 0);
                group.imp_credito_debito += Number(item.imp_credito_debito || 0);
                group.per_iva += Number(item.per_iva || 0);
                group.otros_imp += Number(item.otros_imp || 0);
                group.otros_aran += Number(item.otros_aran || 0);
                group.count += 1;
            }

            const groupedResults = Array.from(groupedMap.values());
            console.log('--- Grouped Settled Results ---');
            console.log(JSON.stringify(groupedResults, null, 2));
            console.log('-------------------------------');

            if (groupedResults.length > 0) {
                await this.taxesDeductionsModel.insertMany(groupedResults);
                console.log('Grouped results saved to TaxesDeductions collection.');
            }

            return groupedResults;

        } catch (error) {
            console.error('Error in groupAndSumSettled:', error);
        }
    }
}

