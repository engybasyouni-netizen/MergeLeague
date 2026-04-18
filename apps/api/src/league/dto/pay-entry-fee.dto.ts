import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class PayEntryFeeDto {
  @IsString()
  @IsNotEmpty()
  seasonId!: string;

  @IsString()
  @IsOptional()
  signedXdr?: string;
}

