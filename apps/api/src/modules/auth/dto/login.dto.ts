import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'administrador@digitaisbr.com' })
  @IsEmail({}, { message: 'Informe um email válido.' })
  email!: string;

  @ApiProperty({ example: 'Admin@2026', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  senha!: string;
}
