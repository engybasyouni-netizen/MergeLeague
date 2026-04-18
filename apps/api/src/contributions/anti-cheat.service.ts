import { Injectable } from "@nestjs/common";
import { ContributionType } from "@prisma/client";

type ActivityLike = {
  type: ContributionType;
  linesChanged: number;
  reviewCommentsCount: number;
  occurredAt: Date;
};

type RuleHit = {
  code: string;
  severity: "low" | "medium" | "high";
  note: string;
};

export type AntiCheatAssessment = {
  qualityScore: number;
  qualityFactor: number;
  spamLikelihood: number;
  isSuspicious: boolean;
  flagReason: string | null;
  notes: string[];
  rules: RuleHit[];
};

export const ANTI_CHEAT_RULES = {
  minimumPrSize: {
    minMeaningfulLines: 20,
    hardTinyLines: 8,
  },
  reviewQuality: {
    zeroCommentReviewPenalty: true,
    shallowReviewCommentThreshold: 2,
    deepReviewCommentThreshold: 4,
  },
  cooldown: {
    windowMinutes: 15,
    burstThreshold: 4,
  },
  anomaly: {
    lookbackItems: 20,
    tinyVsBaselineRatio: 0.15,
    repeatedTinyPrThreshold: 3,
  },
} as const;

@Injectable()
export class AntiCheatService {
  assessContribution(
    contribution: ActivityLike,
    recentHistory: ActivityLike[],
  ): AntiCheatAssessment {
    const rules: RuleHit[] = [];
    let qualityScore = 0.75;
    let qualityFactor = 1;
    let spamLikelihood = 0.05;

    if (contribution.type === ContributionType.PULL_REQUEST) {
      if (contribution.linesChanged < ANTI_CHEAT_RULES.minimumPrSize.hardTinyLines) {
        rules.push({
          code: "tiny_pr_hard_floor",
          severity: "high",
          note: "PR is extremely small and likely to be spam or commit splitting.",
        });
        qualityScore -= 0.45;
        qualityFactor -= 0.65;
        spamLikelihood += 0.6;
      } else if (contribution.linesChanged < ANTI_CHEAT_RULES.minimumPrSize.minMeaningfulLines) {
        rules.push({
          code: "tiny_pr_soft_floor",
          severity: "medium",
          note: "PR is below the minimum meaningful size threshold.",
        });
        qualityScore -= 0.25;
        qualityFactor -= 0.3;
        spamLikelihood += 0.25;
      }

      if (contribution.reviewCommentsCount === 0) {
        rules.push({
          code: "pr_no_review_engagement",
          severity: "low",
          note: "Merged PR had no detectable review discussion.",
        });
        qualityScore -= 0.1;
        spamLikelihood += 0.1;
      }
    }

    if (contribution.type === ContributionType.REVIEW) {
      if (contribution.reviewCommentsCount === 0) {
        rules.push({
          code: "review_zero_comments",
          severity: "high",
          note: "Review has no comments, so it may be a drive-by approval.",
        });
        qualityScore -= 0.5;
        qualityFactor -= 0.65;
        spamLikelihood += 0.55;
      } else if (
        contribution.reviewCommentsCount <= ANTI_CHEAT_RULES.reviewQuality.shallowReviewCommentThreshold
      ) {
        rules.push({
          code: "review_shallow",
          severity: "medium",
          note: "Review depth is shallow and receives reduced weight.",
        });
        qualityScore -= 0.2;
        qualityFactor -= 0.2;
        spamLikelihood += 0.15;
      } else if (
        contribution.reviewCommentsCount >= ANTI_CHEAT_RULES.reviewQuality.deepReviewCommentThreshold
      ) {
        qualityScore += 0.15;
        qualityFactor += 0.15;
      }
    }

    const recentWindow = recentHistory.filter((item) => {
      const diffMs = contribution.occurredAt.getTime() - item.occurredAt.getTime();
      return diffMs >= 0 && diffMs <= ANTI_CHEAT_RULES.cooldown.windowMinutes * 60_000;
    });

    if (recentWindow.length >= ANTI_CHEAT_RULES.cooldown.burstThreshold) {
      rules.push({
        code: "burst_submission_window",
        severity: "high",
        note: "Too many credited submissions landed inside the cooldown window.",
      });
      qualityScore -= 0.2;
      qualityFactor -= 0.25;
      spamLikelihood += 0.3;
    }

    const sameTypeHistory = recentHistory
      .filter((item) => item.type === contribution.type)
      .slice(-ANTI_CHEAT_RULES.anomaly.lookbackItems);

    if (contribution.type === ContributionType.PULL_REQUEST && sameTypeHistory.length >= 5) {
      const averageSize =
        sameTypeHistory.reduce((sum, item) => sum + item.linesChanged, 0) / sameTypeHistory.length;
      const tinyComparedToBaseline =
        averageSize > 0 &&
        contribution.linesChanged < averageSize * ANTI_CHEAT_RULES.anomaly.tinyVsBaselineRatio;

      if (tinyComparedToBaseline) {
        rules.push({
          code: "pr_size_anomaly",
          severity: "medium",
          note: "PR is dramatically smaller than the contributor's recent baseline.",
        });
        qualityScore -= 0.15;
        qualityFactor -= 0.15;
        spamLikelihood += 0.2;
      }

      const recentTinyPrs = sameTypeHistory.filter(
        (item) => item.linesChanged < ANTI_CHEAT_RULES.minimumPrSize.minMeaningfulLines,
      ).length;

      if (
        contribution.linesChanged < ANTI_CHEAT_RULES.minimumPrSize.minMeaningfulLines &&
        recentTinyPrs >= ANTI_CHEAT_RULES.anomaly.repeatedTinyPrThreshold
      ) {
        rules.push({
          code: "repeated_tiny_pr_pattern",
          severity: "high",
          note: "Contributor shows a repeated pattern of tiny PR submissions.",
        });
        qualityScore -= 0.2;
        qualityFactor -= 0.2;
        spamLikelihood += 0.25;
      }
    }

    const boundedQualityScore = this.clamp(qualityScore, 0.05, 1);
    const boundedQualityFactor = this.clamp(qualityFactor, 0.15, 1.25);
    const boundedSpamLikelihood = this.clamp(spamLikelihood, 0, 1);
    const isSuspicious =
      boundedSpamLikelihood >= 0.7 || rules.some((rule) => rule.severity === "high");

    return {
      qualityScore: boundedQualityScore,
      qualityFactor: boundedQualityFactor,
      spamLikelihood: boundedSpamLikelihood,
      isSuspicious,
      flagReason: isSuspicious ? this.pickFlagReason(rules) : null,
      notes: rules.map((rule) => rule.note),
      rules,
    };
  }

  private pickFlagReason(rules: RuleHit[]) {
    const severe = rules.find((rule) => rule.severity === "high") ?? rules[0];
    return severe?.code ?? "anti_cheat_signal";
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}

