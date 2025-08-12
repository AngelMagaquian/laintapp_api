import { Test, TestingModule } from '@nestjs/testing';
import { NotMatchingController } from './not-matching.controller';

describe('NotMatchingController', () => {
  let controller: NotMatchingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotMatchingController],
    }).compile();

    controller = module.get<NotMatchingController>(NotMatchingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
