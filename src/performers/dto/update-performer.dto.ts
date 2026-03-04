import { PartialType } from '@nestjs/mapped-types';
import { CreatePerformerDto } from './create-performer.dto';

export class UpdatePerformerDto extends PartialType(CreatePerformerDto) {
  is_verified?: boolean;
  is_active?: boolean;
}
