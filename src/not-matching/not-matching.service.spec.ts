import { Test, TestingModule } from '@nestjs/testing';
import { NotMatchingService } from './not-matching.service';

describe('NotMatchingService', () => {
  let service: NotMatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotMatchingService],
    }).compile();

    service = module.get<NotMatchingService>(NotMatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
