import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NivelPlano, Role, Usuario } from '@prisma/client';
// bcrypt nativo (Rust): roda no threadpool do libuv em vez de bloquear o event loop
import { hash as hashSenha, hashSync as hashSenhaSync, verify as conferirSenha } from '@node-rs/bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { LoginDto } from './dto/login.dto';
import { RegistrarDto } from './dto/registrar.dto';

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: Role;
    associadoId: string | null;
    plano: string | null;
  };
}

/**
 * Hash descartável usado quando o email não existe, para que o login gaste o
 * mesmo tempo nos dois casos. Gerado de uma senha aleatória a cada boot — nunca
 * confere com nada.
 */
const HASH_ISCA = hashSenhaSync(randomBytes(32).toString('hex'), 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Gate de acesso herdado da plataforma original (tela `/acesso`). */
  validarCodigoAcesso(codigo: string): { valido: boolean } {
    const esperado = this.config.get<string>('ACCESS_CODE');
    return { valido: Boolean(esperado) && codigo === esperado };
  }

  async login(dto: LoginDto, ip?: string): Promise<TokensResponse> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { associado: { select: { id: true, plano: { select: { nivel: true } } } } },
    });

    // Compara sempre, mesmo sem usuário: se retornássemos cedo para email
    // inexistente, o tempo de resposta (sem bcrypt) denunciaria quais contas
    // existem, permitindo enumerá-las apesar da mensagem ser idêntica.
    const hashParaComparar = usuario?.senhaHash ?? HASH_ISCA;
    const senhaConfere = await conferirSenha(dto.senha, hashParaComparar);

    if (!usuario || !senhaConfere) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }
    if (!usuario.ativo) {
      throw new UnauthorizedException('Esta conta está desativada.');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    await this.prisma.logAuditoria.create({
      data: { usuarioId: usuario.id, acao: 'LOGIN', entidade: 'Usuario', entidadeId: usuario.id, ip },
    });

    return this.emitirTokens(usuario, usuario.associado?.id ?? null, usuario.associado?.plano.nivel ?? null);
  }

  async registrar(dto: RegistrarDto): Promise<TokensResponse> {
    const email = dto.email.toLowerCase();

    const [emailEmUso, handleEmUso] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.associado.findUnique({ where: { handle: dto.handle }, select: { id: true } }),
    ]);
    if (emailEmUso) throw new ConflictException('Este email já está cadastrado.');
    if (handleEmUso) throw new ConflictException('Este handle já está em uso.');

    const plano = await this.prisma.plano.findUnique({
      where: { nivel: dto.plano ?? NivelPlano.BASICO },
    });
    if (!plano) throw new BadRequestException('Plano informado não existe.');

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        nome: dto.nome,
        senhaHash: await hashSenha(dto.senha, 10),
        role: Role.ASSOCIADO,
        associado: {
          create: {
            planoId: plano.id,
            nome: dto.nome,
            handle: dto.handle,
            email,
            nicho: dto.nicho,
            assinaturas: { create: { planoId: plano.id, valor: plano.preco } },
            loja: {
              create: {
                nome: `Loja ${dto.nome.split(' ')[0]}`,
                slug: dto.handle,
                descricao: `Loja oficial de ${dto.nome} na DigitaisBR.`,
              },
            },
          },
        },
      },
      include: { associado: { select: { id: true } } },
    });

    return this.emitirTokens(usuario, usuario.associado?.id ?? null, plano.nivel);
  }

  async renovar(refreshToken: string): Promise<TokensResponse> {
    const hash = this.hash(refreshToken);
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: {
        usuario: {
          include: { associado: { select: { id: true, plano: { select: { nivel: true } } } } },
        },
      },
    });

    if (!registro || registro.revogado || registro.expiraEm < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    // rotação: o token usado é invalidado ao emitir o próximo
    await this.prisma.refreshToken.update({ where: { id: registro.id }, data: { revogado: true } });

    return this.emitirTokens(
      registro.usuario,
      registro.usuario.associado?.id ?? null,
      registro.usuario.associado?.plano.nivel ?? null,
    );
  }

  async logout(usuarioId: string): Promise<{ mensagem: string }> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revogado: false },
      data: { revogado: true },
    });
    return { mensagem: 'Sessão encerrada.' };
  }

  async alterarSenha(usuarioId: string, dto: AlterarSenhaDto): Promise<{ mensagem: string }> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });

    if (!(await conferirSenha(dto.senhaAtual, usuario.senhaHash))) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: await hashSenha(dto.novaSenha, 10) },
    });
    // troca de senha derruba as sessões abertas
    await this.logout(usuarioId);

    return { mensagem: 'Senha alterada com sucesso.' };
  }

  async perfil(usuarioId: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ultimoLogin: true,
        criadoEm: true,
        associado: {
          select: {
            id: true,
            handle: true,
            nicho: true,
            seguidores: true,
            engajamento: true,
            status: true,
            pontuacao: true,
            membroDesde: true,
            plano: { select: { nivel: true, nome: true, preco: true, recursos: true } },
            loja: { select: { id: true, nome: true, slug: true, ativa: true } },
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------ internos

  private async emitirTokens(
    usuario: Usuario,
    associadoId: string | null,
    nivelPlano: NivelPlano | null,
  ): Promise<TokensResponse> {
    const payload = { sub: usuario.id, email: usuario.email, role: usuario.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      // `expiresIn` aceita a notação "15m"/"7d"; a tipagem do jsonwebtoken exige o cast
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const dias = this.diasDe(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'));

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(refreshToken),
        usuarioId: usuario.id,
        expiraEm: new Date(Date.now() + dias * 86_400_000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        associadoId,
        plano: nivelPlano,
      },
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private diasDe(expr: string): number {
    const m = /^(\d+)([dhm])$/.exec(expr);
    if (!m) return 7;
    const n = Number(m[1]);
    return m[2] === 'd' ? n : m[2] === 'h' ? n / 24 : n / 1440;
  }
}
