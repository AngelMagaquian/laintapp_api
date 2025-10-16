import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Provider } from '../schemas/provider.schema';
import { CreateProviderDto, UpdateProviderDto, CardTypeDto } from './dto/provider';

@Injectable()
export class ProviderService {
    constructor(@InjectModel(Provider.name) private providerModel: Model<Provider>) {}

    async findAll(): Promise<Provider[]> {
        return this.providerModel.find().exec();
    }

    async create(createProviderDto: CreateProviderDto): Promise<Provider> {
        // Convertir a minúsculas el nombre del proveedor
        const providerData = {
            ...createProviderDto,
            name: createProviderDto.name.toLowerCase(),
            card_type: createProviderDto.card_type.map(cardType => ({
                ...cardType,
                name: cardType.name.toLowerCase()
            }))
        };
        
        const createdProvider = new this.providerModel(providerData);
        return createdProvider.save();
    }

    async update(id: string, updateProviderDto: UpdateProviderDto): Promise<Provider> {
        // Convertir a minúsculas los campos que se van a actualizar
        const updateData: any = { ...updateProviderDto };
        
        if (updateData.name) {
            updateData.name = updateData.name.toLowerCase();
        }
        
        if (updateData.card_type) {
            updateData.card_type = updateData.card_type.map(cardType => ({
                ...cardType,
                name: cardType.name.toLowerCase()
            }));
        }
        
        const provider = await this.providerModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        
        if (!provider) {
            throw new NotFoundException(`Provider with ID ${id} not found`);
        }
        
        return provider;
    }

    async addCardType(providerId: string, cardType: CardTypeDto): Promise<Provider> {
        console.log('Service - ProviderId:', providerId);
        console.log('Service - CardType:', cardType);
        
        const provider = await this.providerModel.findById(providerId);
        
        if (!provider) {
            throw new NotFoundException(`Provider with ID ${providerId} not found`);
        }

        console.log('Found provider:', provider.name);

        // Convertir a minúsculas el nombre del card type antes de agregarlo
        const cardTypeToAdd = {
            ...cardType,
            name: cardType.name.toLowerCase()
        };

        console.log('CardType to add:', cardTypeToAdd);

        // Agregar el nuevo card type al array existente
        provider.card_type.push(cardTypeToAdd);
        
        console.log('Provider card_types after push:', provider.card_type);
        
        return provider.save();
    }

    async delete(id: string): Promise<any> {
        const provider = await this.providerModel.findByIdAndDelete(id);
        
        if (!provider) {
            throw new NotFoundException(`Provider with ID ${id} not found`);
        }
        
        return { message: 'Provider deleted successfully' };
    }
}
