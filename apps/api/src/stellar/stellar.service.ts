import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Asset, Horizon, Keypair, Memo, Networks, Operation, Transaction, TransactionBuilder } from "stellar-sdk";
import { PrismaService } from "../prisma/prisma.service";
import { decryptSecret } from "./secret-box";
import { STELLAR_NETWORKS, STELLAR_PAYOUT_SPLITS } from "./stellar.constants";

type SubmitPaymentParams = {
  sourceSecret: string;
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
};

@Injectable()
export class StellarService {
  private readonly server: Horizon.Server;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.server = new Horizon.Server(
      this.config.get<string>("STELLAR_HORIZON_URL") ?? "https://horizon-testnet.stellar.org",
    );
  }

  getNetworkPassphrase() {
    const network = this.config.get<string>("STELLAR_NETWORK") ?? STELLAR_NETWORKS.TESTNET;
    return network === STELLAR_NETWORKS.PUBLIC ? Networks.PUBLIC : Networks.TESTNET;
  }

  getPoolPublicKey() {
    const poolPublicKey = this.config.get<string>("STELLAR_POOL_PUBLIC_KEY");
    if (!poolPublicKey) {
      throw new BadRequestException("STELLAR_POOL_PUBLIC_KEY must be configured");
    }
    return poolPublicKey;
  }

  getPoolSecretKey() {
    const poolSecretKey = this.config.get<string>("STELLAR_POOL_SECRET_KEY");
    if (!poolSecretKey) {
      throw new BadRequestException("STELLAR_POOL_SECRET_KEY must be configured");
    }
    return poolSecretKey;
  }

  decryptWalletSecret(encryptedSecret: string) {
    const encryptionKey = this.config.get<string>("STELLAR_SECRET_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new BadRequestException("STELLAR_SECRET_ENCRYPTION_KEY must be configured");
    }
    return decryptSecret(encryptedSecret, encryptionKey);
  }

  async fundTestnetAccount(publicKey: string) {
    const network = this.config.get<string>("STELLAR_NETWORK") ?? STELLAR_NETWORKS.TESTNET;
    const autoFund = this.config.get<string>("STELLAR_AUTO_FUND_TESTNET_WALLETS") === "true";

    if (network !== STELLAR_NETWORKS.TESTNET || !autoFund) {
      return null;
    }

    const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new InternalServerErrorException("Failed to fund wallet on Stellar Testnet");
    }

    return response.json();
  }

  async loadAccount(publicKey: string) {
    try {
      return await this.server.loadAccount(publicKey);
    } catch {
      throw new NotFoundException(`Stellar account ${publicKey} was not found on the configured network`);
    }
  }

  async submitPayment(params: SubmitPaymentParams) {
    const sourceAccount = await this.loadAccount(params.sourcePublicKey);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: String(await this.server.fetchBaseFee()),
      networkPassphrase: this.getNetworkPassphrase(),
    })
      .addOperation(
        Operation.payment({
          destination: params.destinationPublicKey,
          asset: Asset.native(),
          amount: params.amount,
        }),
      )
      .addMemo(params.memo ? Memo.text(params.memo.slice(0, 28)) : Memo.none())
      .setTimeout(60)
      .build();

    tx.sign(Keypair.fromSecret(params.sourceSecret));
    return this.server.submitTransaction(tx);
  }

  async buildPaymentXdr(params: {
    sourcePublicKey: string;
    destinationPublicKey: string;
    amount: string;
    memo?: string;
  }) {
    const sourceAccount = await this.loadAccount(params.sourcePublicKey);
    const tx = new TransactionBuilder(sourceAccount, {
      fee: String(await this.server.fetchBaseFee()),
      networkPassphrase: this.getNetworkPassphrase(),
    })
      .addOperation(
        Operation.payment({
          destination: params.destinationPublicKey,
          asset: Asset.native(),
          amount: params.amount,
        }),
      )
      .addMemo(params.memo ? Memo.text(params.memo.slice(0, 28)) : Memo.none())
      .setTimeout(60)
      .build();

    return tx.toXDR();
  }

  async submitSignedXdr(xdr: string) {
    const tx = new Transaction(xdr, this.getNetworkPassphrase());
    return this.server.submitTransaction(tx);
  }

  async transferFromWalletToPool(params: {
    userId: string;
    walletId: string;
    walletPublicKey: string;
    encryptedSecret: string;
    amountXlm: string;
    memo: string;
  }) {
    const result = await this.submitPayment({
      sourceSecret: this.decryptWalletSecret(params.encryptedSecret),
      sourcePublicKey: params.walletPublicKey,
      destinationPublicKey: this.getPoolPublicKey(),
      amount: params.amountXlm,
      memo: params.memo,
    });

    await this.prisma.chainTransaction.create({
      data: {
        walletId: params.walletId,
        userId: params.userId,
        kind: "ENTRY_FEE",
        amountXlm: params.amountXlm,
        txHash: result.hash,
        ledger: result.ledger ?? null,
        memo: params.memo,
        confirmedAt: new Date(),
      },
    });

    return result;
  }

  async transferFromPool(params: {
    walletId?: string;
    userId?: string;
    seasonId: string;
    destinationPublicKey: string;
    amountXlm: string;
    memo: string;
  }) {
    const poolSecretKey = this.getPoolSecretKey();
    const poolPublicKey = this.getPoolPublicKey();
    const result = await this.submitPayment({
      sourceSecret: poolSecretKey,
      sourcePublicKey: poolPublicKey,
      destinationPublicKey: params.destinationPublicKey,
      amount: params.amountXlm,
      memo: params.memo,
    });

    await this.prisma.chainTransaction.create({
      data: {
        walletId: params.walletId,
        userId: params.userId,
        seasonId: params.seasonId,
        kind: "PAYOUT",
        amountXlm: params.amountXlm,
        txHash: result.hash,
        ledger: result.ledger ?? null,
        memo: params.memo,
        confirmedAt: new Date(),
      },
    });

    return result;
  }

  async distributeSeasonRewards(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        leagueEntries: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        scores: {
          where: { rank: { not: null } },
          orderBy: [{ rank: "asc" }, { totalPoints: "desc" }],
          take: 3,
          include: {
            user: {
              include: {
                wallets: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException("Season not found");
    }

    if (season.status !== "ENDED") {
      throw new BadRequestException("Season must be ENDED before rewards can be distributed");
    }

    if (season.scores.length < 3) {
      throw new BadRequestException("At least 3 ranked users are required to distribute rewards");
    }

    const activeEntryCount = season.leagueEntries.length;
    if (activeEntryCount === 0) {
      throw new BadRequestException("No active league entries were paid into this season");
    }
    const prizePool = Number(season.entryFeeXlm.toString()) * activeEntryCount;

    const payouts = await Promise.all(
      season.scores.map(async (score, index) => {
        const wallet = score.user.wallets[0];
        if (!wallet) {
          throw new BadRequestException(`User ${score.githubLogin} does not have a primary wallet`);
        }

        const amountXlm = (prizePool * STELLAR_PAYOUT_SPLITS[index]).toFixed(7);
        const memo = `reward-${season.id.slice(0, 8)}-${index + 1}`;
        const tx = await this.transferFromPool({
          walletId: wallet.id,
          userId: score.userId,
          seasonId: season.id,
          destinationPublicKey: wallet.publicKey,
          amountXlm,
          memo,
        });

        return {
          place: index + 1,
          githubLogin: score.githubLogin,
          walletPublicKey: wallet.publicKey,
          amountXlm,
          txHash: tx.hash,
        };
      }),
    );

    await this.prisma.season.update({
      where: { id: season.id },
      data: { status: "SETTLED" },
    });

    return {
      seasonId: season.id,
      prizePoolXlm: prizePool.toFixed(7),
      payouts,
    };
  }
}
