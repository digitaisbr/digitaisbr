import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarPostDto {
  @ApiProperty({ example: 'Compartilhando os campeões de venda do mês…' })
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  conteudo!: string;

  @ApiPropertyOptional({ description: 'ID da categoria' })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de imagem inválida.' })
  imagemUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legendaImagem?: string;
}

export class AtualizarPostDto extends PartialType(CriarPostDto) {}

export class ComentarDto {
  @ApiProperty({ example: 'Excelente dica, obrigado!' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  conteudo!: string;
}

export class FiltrarPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ID da categoria' })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional({ description: 'ID do autor' })
  @IsOptional()
  @IsString()
  autorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  fixados?: boolean;

  @ApiPropertyOptional({
    enum: ['recentes', 'populares'],
    default: 'recentes',
    description: 'Aba do feed: cronológica ou por engajamento',
  })
  @IsOptional()
  @IsIn(['recentes', 'populares'])
  aba?: 'recentes' | 'populares';
}

export class CriarCategoriaComunidadeDto {
  @ApiProperty({ example: 'Dicas de Vendas' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiPropertyOptional({ example: '💡' })
  @IsOptional()
  @IsString()
  icone?: string;
}
