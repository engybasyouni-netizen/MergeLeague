import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { StellarService } from "./stellar.service";
import { WalletService } from "./wallet.service";
import { ConnectWalletDto } from "./dto/connect-wallet.dto";

@Controller("wallets")
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(
    private readonly wallets: WalletService,
    private readonly stellar: StellarService,
  ) {}

  @Get("me")
  getMyWallet(@CurrentUser() user: User) {
    return this.wallets.getPrimaryWallet(user.id);
  }

  @Post("create")
  async createMyWallet(@CurrentUser() user: User) {
    const wallet = await this.wallets.createCustodialWallet(user.id);

    if (!wallet.fundedAt) {
      await this.stellar.fundTestnetAccount(wallet.publicKey);
      await this.wallets.markFunded(wallet.id);
      return this.wallets.getPrimaryWallet(user.id);
    }

    return wallet;
  }

  @Post("connect")
  async connectWallet(@CurrentUser() user: User, @Body() dto: ConnectWalletDto) {
    const wallet = await this.wallets.connectNonCustodialWallet({
      userId: user.id,
      publicKey: dto.publicKey,
      network: dto.network,
    });

    if (!wallet.fundedAt) {
      await this.stellar.fundTestnetAccount(wallet.publicKey);
      await this.wallets.markFunded(wallet.id);
      return this.wallets.getPrimaryWallet(user.id);
    }

    return wallet;
  }
}

