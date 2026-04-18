import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StellarService } from "./stellar.service";
import { WalletService } from "./wallet.service";
import { WalletsController } from "./wallets.controller";

@Module({
  imports: [PrismaModule],
  controllers: [WalletsController],
  providers: [WalletService, StellarService],
  exports: [WalletService, StellarService],
})
export class StellarModule {}

