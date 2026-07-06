import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AttentionEngineService } from "./attention-engine.service";
import { AttentionRepository } from "./attention-repository";

@Module({
	imports: [DatabaseModule],
	providers: [AttentionRepository, AttentionEngineService],
	exports: [AttentionRepository, AttentionEngineService],
})
export class AttentionModule {}
