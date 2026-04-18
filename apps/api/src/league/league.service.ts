import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StellarService } from "../stellar/stellar.service";
import { WalletService } from "../stellar/wallet.service";
import { JoinLeagueDto } from "./dto/join-league.dto";

@Injectable()
export class LeagueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletService,
    private readonly stellar: StellarService,
  ) {}

  async join(userId: string, dto: JoinLeagueDto) {
    const season = await this.prisma.season.findUnique({ where: { id: dto.seasonId } });
    if (!season) {
      throw new NotFoundException("Season not found");
    }
    if (!["UPCOMING", "ACTIVE"].includes(season.status)) {
      throw new BadRequestException("Season is not open for new entries");
    }

    if (dto.teamId) {
      const membership = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: dto.teamId, userId } },
      });
      if (!membership) {
        throw new ForbiddenException("You must be a member of the team to join under it");
      }
    }

    const wallet = await this.wallets.createCustodialWallet(userId);
    if (!wallet.fundedAt) {
      await this.stellar.fundTestnetAccount(wallet.publicKey);
      await this.wallets.markFunded(wallet.id);
    }

    const paymentMemo = `join-${dto.seasonId.slice(0, 8)}-${userId.slice(0, 8)}`;

    const entry = await this.prisma.leagueEntry.upsert({
      where: { userId_seasonId: { userId, seasonId: dto.seasonId } },
      create: {
        userId,
        seasonId: dto.seasonId,
        teamId: dto.teamId,
        status: "PENDING_PAYMENT",
        paymentMemo,
      },
      update: {
        ...(dto.teamId != null ? { teamId: dto.teamId } : {}),
        paymentMemo,
      },
      include: {
        season: { select: { id: true, name: true, status: true, entryFeeXlm: true } },
        team: { select: { id: true, name: true, slug: true } },
      },
    });

    return {
      ...entry,
      payment: {
        network: wallet.network,
        walletPublicKey: wallet.publicKey,
        poolPublicKey: season.poolPublicKey ?? this.stellar.getPoolPublicKey(),
        amountXlm: season.entryFeeXlm.toString(),
        memo: entry.paymentMemo,
      },
    };
  }

  async payEntryFee(userId: string, seasonId: string, signedXdr?: string) {
    const entry = await this.prisma.leagueEntry.findUnique({
      where: { userId_seasonId: { userId, seasonId } },
      include: { season: true },
    });
    if (!entry) {
      throw new NotFoundException("League entry not found");
    }
    if (entry.season.status !== "ACTIVE") {
      throw new BadRequestException("Season must be ACTIVE before entry fees can be paid");
    }

    if (entry.status === "ACTIVE") {
      throw new BadRequestException("League entry is already active");
    }

    const memo = entry.paymentMemo ?? `join-${seasonId.slice(0, 8)}-${userId.slice(0, 8)}`;
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, isPrimary: true },
    });
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }

    if (!wallet.encryptedSecret) {
      // Freighter/non-custodial flow: first call returns an XDR to sign; second call submits signed XDR.
      if (!signedXdr) {
        const xdr = await this.stellar.buildPaymentXdr({
          sourcePublicKey: wallet.publicKey,
          destinationPublicKey: this.stellar.getPoolPublicKey(),
          amount: entry.season.entryFeeXlm.toString(),
          memo,
        });

        return {
          status: "SIGNATURE_REQUIRED" as const,
          networkPassphrase: this.stellar.getNetworkPassphrase(),
          xdr,
          payment: {
            walletPublicKey: wallet.publicKey,
            poolPublicKey: this.stellar.getPoolPublicKey(),
            amountXlm: entry.season.entryFeeXlm.toString(),
            memo,
          },
        };
      }

      const result = await this.stellar.submitSignedXdr(signedXdr);
      await this.prisma.chainTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          kind: "ENTRY_FEE",
          amountXlm: entry.season.entryFeeXlm.toString(),
          txHash: result.hash,
          ledger: result.ledger ?? null,
          memo,
          confirmedAt: new Date(),
        },
      });

      const updated = await this.prisma.leagueEntry.update({
        where: { id: entry.id },
        data: {
          status: "ACTIVE",
          paidAt: new Date(),
          entryTxHash: result.hash,
          paymentMemo: memo,
        },
        include: {
          season: { select: { id: true, name: true, status: true, entryFeeXlm: true } },
          team: { select: { id: true, name: true, slug: true } },
        },
      });

      return {
        ...updated,
        payment: {
          txHash: result.hash,
          poolPublicKey: this.stellar.getPoolPublicKey(),
          amountXlm: entry.season.entryFeeXlm.toString(),
        },
      };
    }

    const tx = await this.stellar.transferFromWalletToPool({
      userId,
      walletId: wallet.id,
      walletPublicKey: wallet.publicKey,
      encryptedSecret: wallet.encryptedSecret,
      amountXlm: entry.season.entryFeeXlm.toString(),
      memo,
    });

    const updated = await this.prisma.leagueEntry.update({
      where: { id: entry.id },
      data: {
        status: "ACTIVE",
        paidAt: new Date(),
        entryTxHash: tx.hash,
        paymentMemo: memo,
      },
      include: {
        season: { select: { id: true, name: true, status: true, entryFeeXlm: true } },
        team: { select: { id: true, name: true, slug: true } },
      },
    });

    return {
      ...updated,
      payment: {
        txHash: tx.hash,
        poolPublicKey: this.stellar.getPoolPublicKey(),
        amountXlm: entry.season.entryFeeXlm.toString(),
      },
    };
  }
}
