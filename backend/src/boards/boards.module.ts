import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { Board, BoardSchema } from './entities/board.entity';

@Module({
  imports: [
    // Registra el schema de Board en MongoDB
    MongooseModule.forFeature([{ name: Board.name, schema: BoardSchema }]),
  ],
  controllers: [BoardsController],
  providers: [BoardsService],
  exports: [BoardsService], // Exporta el servicio para usarlo en otros módulos
})
export class BoardsModule {}
