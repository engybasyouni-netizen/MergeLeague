import { Controller, Get } from "@nestjs/common";
import { SeasonsService } from "./seasons.service";

@Controller(["season", "seasons"])
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get("current")
  current() {
    return this.seasons.getCurrent();
  }
}
