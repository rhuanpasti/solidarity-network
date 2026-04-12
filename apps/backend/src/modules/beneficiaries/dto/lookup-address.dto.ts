import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class LookupAddressDto {
  @ApiProperty()
  @IsString()
  @MaxLength(20)
  postalCode!: string;
}
