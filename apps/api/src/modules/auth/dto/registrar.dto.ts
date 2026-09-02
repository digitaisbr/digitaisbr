import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NivelPlano } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegistrarDto {
  @ApiProperty({ example: 'Nova Creator' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 'nova-creator@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Senha@2026', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  senha!: string;

  @ApiProperty({ example: 'nova-creator', description: 'Handle público, usado na URL da loja' })
  @IsString()
  @Matches(/^[a-z0-9-]{3,40}$/, {
    message: 'O handle deve conter apenas letras minúsculas, números e hífens.',
  })
  handle!: string;

  @ApiPropertyOptional({ enum: NivelPlano, default: NivelPlano.BASICO })
  @IsOptional()
  @IsEnum(NivelPlano)
  plano?: NivelPlano;

  @ApiPropertyOptional({ example: 'Lifestyle' })
  @IsOptional()
  @IsString()
  nicho?: string;
}
