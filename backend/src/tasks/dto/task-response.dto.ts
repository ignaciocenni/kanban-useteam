export interface TaskResponseDto {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  column: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}
