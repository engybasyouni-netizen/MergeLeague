import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class JoinLeagueDto {
  @IsString()
  @IsNotEmpty()
  seasonId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teamId?: string;
}
