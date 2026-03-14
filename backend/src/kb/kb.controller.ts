import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '../../drizzle/schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatusGuard } from '../common/guards/status.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { KbSearchDto, kbSearchSchema } from './dto/kb-search.dto';
import { ListKbItemsDto, listKbItemsSchema } from './dto/list-kb-items.dto';
import { SaveKbItemDto, saveKbItemSchema } from './dto/save-kb-item.dto';
import { KbService } from './kb.service';

@UseGuards(JwtAuthGuard, StatusGuard)
@Controller('kb')
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Post('save')
  async save(
    @Body(new ZodValidationPipe(saveKbItemSchema)) dto: SaveKbItemDto,
    @CurrentUser() user: User,
  ) {
    return this.kbService.save(user.id, dto);
  }

  @Get('items')
  async list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(listKbItemsSchema)) dto: ListKbItemsDto,
  ) {
    return this.kbService.list(user.id, dto.tag, dto.page, dto.limit);
  }

  @Get('search')
  async search(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(kbSearchSchema)) params: KbSearchDto,
  ) {
    return this.kbService.search(user.id, params.q);
  }

  @Get('items/:id')
  async findOne(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.kbService.findOne(user.id, id);
  }

  @Delete('items/:id')
  @HttpCode(204)
  async delete(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    await this.kbService.delete(user.id, id);
  }
}
