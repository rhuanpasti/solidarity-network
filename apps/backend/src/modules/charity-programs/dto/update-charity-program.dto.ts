import { PartialType } from '@nestjs/mapped-types';
import { CreateCharityProgramDto } from './create-charity-program.dto';

export class UpdateCharityProgramDto extends PartialType(CreateCharityProgramDto) {}

