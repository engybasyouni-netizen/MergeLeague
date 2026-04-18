import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { STELLAR_NETWORKS } from "../stellar.constants";

export class ConnectWalletDto {
  @IsString()
  @IsNotEmpty()
  publicKey!: string;

  @IsString()
  @IsOptional()
  @IsIn([STELLAR_NETWORKS.TESTNET, STELLAR_NETWORKS.PUBLIC])
  network?: string;
}

