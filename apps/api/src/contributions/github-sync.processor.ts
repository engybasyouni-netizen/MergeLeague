import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { GithubSyncJobData } from "./github-sync.types";
import { ContributionsService } from "./contributions.service";

@Processor("github-sync")
export class GithubSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubSyncProcessor.name);

  constructor(private readonly contributions: ContributionsService) {
    super();
  }

  async process(job: Job<GithubSyncJobData>) {
    this.logger.log(`github-sync job ${String(job.id)} start user=${job.data.githubLogin}`);
    const result = await this.contributions.runSyncJob(job.data);
    this.logger.log(`github-sync job ${String(job.id)} done`);
    return result;
  }
}
