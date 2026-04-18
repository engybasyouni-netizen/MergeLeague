import { Module } from "@nestjs/common";
import { GithubActivityService } from "./github-activity.service";
import { GithubGraphqlService } from "./github-graphql.service";

@Module({
  providers: [GithubGraphqlService, GithubActivityService],
  exports: [GithubGraphqlService, GithubActivityService],
})
export class GithubModule {}
