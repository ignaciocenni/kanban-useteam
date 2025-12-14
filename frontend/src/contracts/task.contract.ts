export interface TaskContract {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  column: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateTaskContract = Omit<TaskContract, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTaskContract = Partial<Omit<TaskContract, 'id' | 'createdAt' | 'updatedAt'>>;

