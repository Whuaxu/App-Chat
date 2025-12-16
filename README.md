git clone <repo-url>
cd App-Chat
docker compose up --build

# App-Chat

Real-time chat application with Angular (frontend) and LoopBack 4 (backend) using MongoDB and WebSockets.

## Features
- User registration and login
- Private conversations
- Real-time messaging via WebSocket (Socket.IO)
- Typing notifications
- Online/offline user status
- Docker Compose for development and deployment

## Project Structure

```
App-Chat/
├── backend/      # REST API and WebSocket (LoopBack 4)
├── frontend/     # Angular application
```

## Requirements
- Node.js >= 18
- Docker and Docker Compose (optional, recommended)

## Quick Installation

### 1. Clone the repository
```bash
git clone <repo-url>
cd App-Chat
```

### 2. Start everything with Docker Compose
```bash
cd backend
# Start backend and frontend
# (Make sure ports and variables are set in both docker-compose.yml files)
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3002
- Frontend docker: http://localhost:4201
- Backend API docker: http://localhost:3001

### 3. Or start manually
#### Backend
```bash
cd backend
npm install
npm start
```
#### Frontend
```bash
cd frontend
npm install
ng serve
```

## Environment Variables
Set the required variables in both projects (`.env` or directly in docker-compose):
- BACKEND: JWT_SECRET, MONGODB_URL, etc.
- FRONTEND: environment.ts for backend and WebSocket URLs

## Useful Scripts
- `npm start` (backend): Starts the API and WebSocket
- `ng serve` (frontend): Starts Angular in development mode
- `docker compose up` (in each folder): Starts the corresponding service

## Notes
- The frontend connects to the backend via REST and WebSocket (make sure the URLs match)
- The backend uses MongoDB (you can run it with Docker or locally)
- Angular's signal system ensures a reactive and efficient UI
