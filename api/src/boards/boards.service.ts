import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { IBoardCreate, IBoardUpdate } from './DTO/create-board.dto';
import { ColumnService } from 'src/columns/column.service';

@Injectable()
export class BoardsService {
    constructor(
        @InjectRepository(Board)
        private boardRepository: Repository<Board>,
        private readonly columnService: ColumnService
    ) { }

    async getAllBoards(userId: number): Promise<Board[]> {
        return this.boardRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            relations: ['user']
        });
    }

    async getBoardById(id: number): Promise<Board> {
        const board = await this.boardRepository.findOne({
            where: { id },
            relations: {
                user: true,
                columns: {
                    tasks: true
                }
            },
            order: {
                columns: {
                    position: 'ASC',
                    tasks: {
                        id: 'ASC'
                    }
                }
            }
        });

        if (!board) {
            throw new NotFoundException(`Board with ID ${id} not found`);
        }

        return board;
    }

    async createBoard(createBoardDto: IBoardCreate, userId: number): Promise<Board> {
        const board = this.boardRepository.create({
            ...createBoardDto,
            user: { id: userId }
        });

        return this.boardRepository.save(board);
    }

    async updateBoard(board: IBoardUpdate): Promise<Board> {
        const existingBoard = await this.boardRepository.findOneBy({ id: board.id });
        if (!existingBoard) {
            throw new NotFoundException(`Board with ID ${board.id} not found`);
        }

        existingBoard.title = board.title;
        return this.boardRepository.save(existingBoard);
    }

    async deleteBoard(id: number): Promise<void> {
        if (!id) {
            throw new BadRequestException('Board ID is required');
        }

        const board = await this.boardRepository.findOne({
            where: { id },
            relations: ['columns']
        });

        if (!board) {
            throw new NotFoundException(`Board com ID ${id} não encontrada`);
        }

        if (board.columns && board.columns.length > 0) {
            for (const column of board.columns) {
                await this.columnService.deleteColumn(column.id);
            }
        }

        const result = await this.boardRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Board com ID ${id} não encontrada`);
        }
    }

}