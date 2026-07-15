import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
import {
  AddCardsToBaralhoUseCase,
  CreateBaralhoUseCase,
  DeleteBaralhoUseCase,
  GetBaralhoUseCase,
  ImportBaralhosUseCase,
  ListBaralhosUseCase,
  RemoveCardFromBaralhoUseCase,
  RenameBaralhoUseCase,
} from '../application/use-cases/baralho.use-cases';
import { BaralhosExceptionFilter } from './baralhos-exception.filter';
import type { BaralhoDetail, BaralhoListItem } from '../domain/baralho-views';

interface CreateBaralhoBody {
  titulo?: string;
  flashcardIds?: string[];
}

interface RenameBaralhoBody {
  titulo?: string;
}

interface AddCardsBody {
  flashcardIds?: string[];
}

interface ImportBody {
  baralhos?: unknown;
}

@UseGuards(JwtAuthGuard)
@UseFilters(BaralhosExceptionFilter)
@Controller('baralhos')
export class BaralhosController {
  constructor(
    private readonly listBaralhos: ListBaralhosUseCase,
    private readonly getBaralho: GetBaralhoUseCase,
    private readonly createBaralho: CreateBaralhoUseCase,
    private readonly renameBaralho: RenameBaralhoUseCase,
    private readonly deleteBaralho: DeleteBaralhoUseCase,
    private readonly addCards: AddCardsToBaralhoUseCase,
    private readonly removeCard: RemoveCardFromBaralhoUseCase,
    private readonly importBaralhos: ImportBaralhosUseCase,
  ) {}

  @Get()
  list(@CurrentUser('id') userId: string): Promise<BaralhoListItem[]> {
    return this.listBaralhos.execute(userId);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() body: CreateBaralhoBody,
  ): Promise<{ baralhoId: string }> {
    return this.createBaralho.execute(userId, body.titulo ?? '', body.flashcardIds ?? []);
  }

  @Post('import')
  async import(
    @CurrentUser('id') userId: string,
    @Body() body: ImportBody,
  ): Promise<{ count: number }> {
    return this.importBaralhos.execute(userId, body.baralhos);
  }

  @Get(':baralhoId')
  detail(
    @CurrentUser('id') userId: string,
    @Param('baralhoId') baralhoId: string,
  ): Promise<BaralhoDetail> {
    return this.getBaralho.execute(userId, baralhoId);
  }

  @Patch(':baralhoId')
  async rename(
    @CurrentUser('id') userId: string,
    @Param('baralhoId') baralhoId: string,
    @Body() body: RenameBaralhoBody,
  ): Promise<{ success: boolean }> {
    await this.renameBaralho.execute(userId, baralhoId, body.titulo ?? '');
    return { success: true };
  }

  @Delete(':baralhoId')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('baralhoId') baralhoId: string,
  ): Promise<{ success: boolean }> {
    await this.deleteBaralho.execute(userId, baralhoId);
    return { success: true };
  }

  @Post(':baralhoId/cards')
  async addCardsToBaralho(
    @CurrentUser('id') userId: string,
    @Param('baralhoId') baralhoId: string,
    @Body() body: AddCardsBody,
  ): Promise<{ success: boolean }> {
    await this.addCards.execute(userId, baralhoId, body.flashcardIds ?? []);
    return { success: true };
  }

  @Delete(':baralhoId/cards/:flashcardId')
  async removeCardFromBaralho(
    @CurrentUser('id') userId: string,
    @Param('baralhoId') baralhoId: string,
    @Param('flashcardId') flashcardId: string,
  ): Promise<{ success: boolean }> {
    await this.removeCard.execute(userId, baralhoId, flashcardId);
    return { success: true };
  }
}
