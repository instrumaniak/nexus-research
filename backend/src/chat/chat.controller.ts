import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StatusGuard } from '../common/guards/status.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { User } from '../../drizzle/schema';
import { OrchestratorService } from '../agents/orchestrator/orchestrator.service';
import { chatStreamSchema, ChatStreamDto } from './dto/chat-stream.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly chatService: ChatService,
  ) {}

  @Post('stream')
  @UseGuards(JwtAuthGuard, StatusGuard)
  async stream(
    @Body(new ZodValidationPipe(chatStreamSchema)) dto: ChatStreamDto,
    @CurrentUser() user: User,
    @Res() response: Response,
  ): Promise<void> {
    if (dto.sessionId) {
      await this.chatService.verifySessionOwnership(dto.sessionId, user.id);
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    if (dto.mode === 'KB_SEARCH' || dto.mode === 'DEEP_RESEARCH') {
      response.write(`data: ${JSON.stringify({ step: 'error', message: 'Coming soon' })}\n\n`);
      response.end();
      return;
    }

    let fullAnswer = '';
    let completed = false;
    let sources: Array<{ title: string; url: string }> = [];

    try {
      for await (const event of this.orchestratorService.runWebSearch(dto.query, user.id)) {
        if (event.step === 'token') {
          fullAnswer += event.token;
        }

        if (event.step === 'done') {
          completed = true;
          sources = event.sources;
        }

        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      if (completed) {
        await this.chatService.saveSession(
          user.id,
          dto.query,
          fullAnswer,
          sources,
          dto.mode,
          dto.sessionId,
        );
      }
    } finally {
      response.end();
    }
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, StatusGuard)
  async getSessions(@CurrentUser() user: User) {
    return this.chatService.getSessions(user.id);
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard, StatusGuard)
  async getSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Req() _request: Request,
  ) {
    void _request;
    return this.chatService.getSession(sessionId, user.id);
  }
}
