import { Test, TestingModule } from '@nestjs/testing';
import { CompilerService } from './compiler.service';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';

describe('CompilerService', () => {
  let service: CompilerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompilerService,
        {
          provide: DatabaseService,
          useValue: {
            get: jest.fn(),
            run: jest.fn(),
            all: jest.fn(),
          },
        },
        {
          provide: LlmService,
          useValue: {
            compileText: jest.fn(),
            generateEmbedding: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CompilerService>(CompilerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
