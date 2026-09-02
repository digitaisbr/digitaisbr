import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { CodigoAcessoDto } from './dto/codigo-acesso.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegistrarDto } from './dto/registrar.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('codigo-acesso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valida o código de acesso da plataforma (gate anterior ao login)' })
  validarCodigo(@Body() dto: CodigoAcessoDto) {
    return this.auth.validarCodigoAcesso(dto.codigo);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica e devolve access + refresh token' })
  @ApiResponse({ status: 200, description: 'Autenticado' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.ip);
  }

  @Public()
  @Post('registrar')
  @ApiOperation({ summary: 'Cria uma conta de associado (com loja e assinatura)' })
  registrar(@Body() dto: RegistrarDto) {
    return this.auth.registrar(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access token (com rotação do refresh)' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.renovar(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga todos os refresh tokens do usuário' })
  logout(@CurrentUser('id') usuarioId: string) {
    return this.auth.logout(usuarioId);
  }

  @ApiBearerAuth()
  @Get('perfil')
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  perfil(@CurrentUser('id') usuarioId: string) {
    return this.auth.perfil(usuarioId);
  }

  @ApiBearerAuth()
  @Post('alterar-senha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Altera a senha e encerra as sessões abertas' })
  alterarSenha(@CurrentUser('id') usuarioId: string, @Body() dto: AlterarSenhaDto) {
    return this.auth.alterarSenha(usuarioId, dto);
  }
}
