import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Sonda de saúde para o Docker e para o balanceador.
 *
 * Precisa ser pública: quem pergunta é a infraestrutura, que não tem token.
 * E precisa tocar o banco — um processo que responde mas perdeu a conexão com
 * o Postgres está morto para todos os efeitos práticos.
 */
@ApiTags('Saúde')
@Controller('health')
export class SaudeController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Diz se a API e o banco estão respondendo' })
  async verificar() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // 503 para o healthcheck reprovar; a mensagem não expõe o erro do banco
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
