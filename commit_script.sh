#!/bin/bash
cd "c:/Users/ignac/Desktop/dev/kanban-useteam"

echo "=== Estado inicial del repositorio ==="
git status

echo "=== Agregando archivos de configuración ==="
git add .gitignore .prettierrc eslint.config.mjs tsconfig*.json nest-cli.json
git commit -m "chore: initial project configuration

- Add .gitignore for Node.js/NestJS project
- Configure ESLint, Prettier, and TypeScript settings
- Set up NestJS CLI configuration"

echo "=== Agregando infraestructura Docker ==="
git add docker-compose.yml .env.example
git commit -m "feat: docker infrastructure setup

- Configure Docker Compose with MongoDB and N8N services
- Set up environment variables template
- Configure networking between services"

echo "=== Agregando entidades y DTOs de Boards ==="
git add src/boards/entities/ src/boards/dto/
git commit -m "feat: board entity and DTOs

- Create Board entity with Mongoose schema
- Add CreateBoardDto and UpdateBoardDto with validation
- Define board data structure with columns support"

echo "=== Agregando servicio y controlador de Boards ==="
git add src/boards/boards.service.ts src/boards/boards.controller.ts src/boards/boards.module.ts
git commit -m "feat: boards CRUD operations

- Implement BoardsService with full CRUD functionality
- Create BoardsController with REST endpoints
- Set up BoardsModule with dependency injection"

echo "=== Agregando entidades y DTOs de Tasks ==="
git add src/tasks/entities/ src/tasks/dto/
git commit -m "feat: task entity and DTOs

- Create Task entity with board reference and position
- Add CreateTaskDto and UpdateTaskDto with validation
- Define task data structure for kanban functionality"

echo "=== Agregando servicio y controlador de Tasks ==="
git add src/tasks/tasks.service.ts src/tasks/tasks.controller.ts src/tasks/tasks.module.ts
git commit -m "feat: tasks CRUD operations

- Implement TasksService with full CRUD functionality
- Create TasksController with REST endpoints
- Set up TasksModule with dependency injection"

echo "=== Agregando configuración principal ==="
git add src/app.module.ts src/main.ts package.json
git commit -m "feat: application bootstrap and modules

- Configure AppModule with MongoDB and feature modules
- Set up main.ts with CORS and validation pipes
- Update package.json with NestJS dependencies"

echo "=== Agregando documentación ==="
git add plan_de_ataque.txt START.md
git commit -m "docs: project planning and startup guide

- Add detailed development roadmap
- Create startup instructions for development
- Document project structure and phases"

echo "=== Estado final ==="
git log --oneline -10
