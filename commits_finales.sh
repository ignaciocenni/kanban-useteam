#!/bin/bash
cd "c:/Users/ignac/Desktop/dev/kanban-useteam"

echo "=== Commit 1: Configuración inicial del proyecto ==="
git add .gitignore
git commit -m "chore: initial project configuration

- Add .gitignore for Node.js/NestJS project
- Configure project structure and ignore patterns"

echo "=== Commit 2: Infraestructura Docker ==="
git add docker-compose.yml .env.example
git commit -m "feat: docker infrastructure setup

- Configure Docker Compose with MongoDB and N8N services
- Set up environment variables template
- Configure networking between services"

echo "=== Commit 3: Configuración del backend NestJS ==="
git add backend/.gitignore backend/.prettierrc backend/eslint.config.mjs backend/tsconfig*.json backend/nest-cli.json backend/package*.json
git commit -m "feat: nestjs backend configuration

- Set up NestJS project structure and dependencies
- Configure ESLint, Prettier, and TypeScript settings
- Define package.json with required dependencies"

echo "=== Commit 4: Entidades del backend ==="
git add backend/src/boards/entities/ backend/src/tasks/entities/
git commit -m "feat: database entities

- Create Board entity with Mongoose schema
- Create Task entity with board reference and position
- Define data models for kanban functionality"

echo "=== Commit 5: DTOs del backend ==="
git add backend/src/boards/dto/ backend/src/tasks/dto/
git commit -m "feat: data transfer objects

- Add CreateBoardDto and UpdateBoardDto with validation
- Add CreateTaskDto and UpdateTaskDto with validation
- Define API contracts for frontend integration"

echo "=== Commit 6: Servicios del backend ==="
git add backend/src/boards/boards.service.ts backend/src/tasks/tasks.service.ts
git commit -m "feat: business logic services

- Implement BoardsService with full CRUD functionality
- Implement TasksService with full CRUD functionality
- Add data access layer and business rules"

echo "=== Commit 7: Controladores del backend ==="
git add backend/src/boards/boards.controller.ts backend/src/tasks/tasks.controller.ts
git commit -m "feat: REST API controllers

- Create BoardsController with REST endpoints
- Create TasksController with REST endpoints
- Implement HTTP request handling"

echo "=== Commit 8: Módulos del backend ==="
git add backend/src/boards/boards.module.ts backend/src/tasks/tasks.module.ts backend/src/app.module.ts
git commit -m "feat: nestjs modules

- Set up BoardsModule with dependency injection
- Set up TasksModule with dependency injection
- Configure AppModule with MongoDB and feature modules"

echo "=== Commit 9: Configuración principal ==="
git add backend/src/main.ts
git commit -m "feat: application bootstrap

- Configure main.ts with CORS and validation pipes
- Set up application initialization and middleware
- Define server startup configuration"

echo "=== Commit 10: Documentación del proyecto ==="
git add plan_de_ataque.txt START.md
git commit -m "docs: project planning and startup guide

- Add detailed development roadmap
- Create startup instructions for development
- Document project structure and phases"

echo "=== Estado final del repositorio ==="
git log --oneline
