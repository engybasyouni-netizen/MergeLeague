import { IsOptional, IsString } from "class-validator";

export class SyncContributionsDto {
  @IsOptional()
  @IsString()
  seasonId?: string;
}
