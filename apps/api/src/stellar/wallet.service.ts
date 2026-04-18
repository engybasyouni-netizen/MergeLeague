import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Keypair } from "stellar-sdk";
import { PrismaService } from "../prisma/prisma.service";
import { encryptSecret } from "./secret-box";

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getPrimaryWallet(userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, isPrimary: true },
      select: {
        id: true,
        publicKey: true,
        network: true,
        label: true,
        isPrimary: true,
        fundedAt: true,
        createdAt: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    return wallet;
  }

  async getPrimaryWalletWithSecret(userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, isPrimary: true },
    });

    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    if (!wallet.encryptedSecret) {
      throw new InternalServerErrorException("Wallet secret is unavailable");
    }

    return wallet;
  }

  async createCustodialWallet(userId: string) {
    const existing = await this.prisma.wallet.findFirst({
      where: { userId, isPrimary: true },
      select: {
        id: true,
        publicKey: true,
        network: true,
        label: true,
        isPrimary: true,
        fundedAt: true,
        createdAt: true,
      },
    });

    if (existing) {
      return existing;
    }

    const encryptionKey = this.config.get<string>("STELLAR_SECRET_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new BadRequestException("STELLAR_SECRET_ENCRYPTION_KEY must be configured");
    }

    const network = this.config.get<string>("STELLAR_NETWORK") ?? "TESTNET";
    const keypair = Keypair.random();

    return this.prisma.wallet.create({
      data: {
        userId,
        publicKey: keypair.publicKey(),
        encryptedSecret: encryptSecret(keypair.secret(), encryptionKey),
        network,
        label: "Primary custodial wallet",
        isPrimary: true,
      },
      select: {
        id: true,
        publicKey: true,
        network: true,
        label: true,
        isPrimary: true,
        fundedAt: true,
        createdAt: true,
      },
    });
  }

  async markFunded(walletId: string) {
    await this.prisma.wallet.update({
      where: { id: walletId },
      data: { fundedAt: new Date() },
    });
  }

  async connectNonCustodialWallet(params: { userId: string; publicKey: string; network?: string }) {
    const network = params.network ?? (this.config.get<string>("STELLAR_NETWORK") ?? "TESTNET");

    await this.prisma.wallet.updateMany({
      where: { userId: params.userId, isPrimary: true },
      data: { isPrimary: false },
    });

    return this.prisma.wallet.upsert({
      where: { publicKey: params.publicKey },
      create: {
        userId: params.userId,
        publicKey: params.publicKey,
        encryptedSecret: null,
        network,
        label: "Freighter wallet",
        isPrimary: true,
      },
      update: {
        userId: params.userId,
        network,
        label: "Freighter wallet",
        isPrimary: true,
        encryptedSecret: null,
      },
      select: {
        id: true,
        publicKey: true,
        network: true,
        label: true,
        isPrimary: true,
        fundedAt: true,
        createdAt: true,
      },
    });
  }
}

