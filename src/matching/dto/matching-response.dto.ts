import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { MatchResult } from './matching-file';

export class MatchingResponseDto {
  @ApiProperty({ 
    description: 'Resultados del proceso de matching',
    type: [MatchResult]
  })
  @IsArray()
  matchingValues: MatchResult[];

  @ApiProperty({ 
    description: 'Proveedores que no tuvieron match',
    type: [Object],
    additionalProperties: true
  })
  @IsArray()
  notMatching: any[];
} 