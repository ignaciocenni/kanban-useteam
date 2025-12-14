import { Task } from '../types'
import { TaskContract, CreateTaskContract, UpdateTaskContract } from '../contracts/task.contract'

export function fromTaskContract(contract: TaskContract): Task {
  return {
    id: contract.id,
    boardId: contract.boardId,
    title: contract.title,
    description: contract.description,
    columnId: contract.column,
    position: contract.position,
    createdAt: new Date(contract.createdAt),
    updatedAt: new Date(contract.updatedAt)
  }
}

export function toCreateTaskContract(task: Partial<Task>): CreateTaskContract {
  return {
    boardId: task.boardId!,
    title: task.title!,
    description: task.description ?? '',
    column: task.columnId!,
    position: task.position ?? 0
  }
}

export function toUpdateTaskContract(task: Partial<Task>): UpdateTaskContract {
  const payload: UpdateTaskContract = {}
  if (task.title !== undefined) payload.title = task.title
  if (task.description !== undefined) payload.description = task.description
  if (task.columnId !== undefined) payload.column = task.columnId
  if (task.position !== undefined) payload.position = task.position
  // createdAt / updatedAt no se envían en PATCH de dominio
  return payload
}

export function fromTaskContractPartial(
  partial: Partial<TaskContract>
): Partial<Task> {
  const domain: Partial<Task> = {}
  if (partial.title !== undefined) domain.title = partial.title
  if (partial.description !== undefined) domain.description = partial.description
  if (partial.column !== undefined) domain.columnId = partial.column
  if (partial.position !== undefined) domain.position = partial.position
  if (partial.createdAt !== undefined) domain.createdAt = new Date(partial.createdAt)
  if (partial.updatedAt !== undefined) domain.updatedAt = new Date(partial.updatedAt)
  if (partial.boardId !== undefined) domain.boardId = partial.boardId
  if (partial.id !== undefined) domain.id = partial.id
  return domain
}
