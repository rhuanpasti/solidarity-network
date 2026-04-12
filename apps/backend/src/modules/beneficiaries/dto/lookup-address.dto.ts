import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LookupAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;
}
