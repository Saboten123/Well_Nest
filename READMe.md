# Well-Nest

Well-Nest is a full-stack mental health and wellness platform that connects users with healthcare professionals and provides an AI-powered conversational assistant.

The project consists of a React frontend, a Node.js/Express backend, and a Python-based AI backend. MongoDB is used as the primary database.

## Features

- User registration and authentication
- JWT-based authentication and protected routes
- Patient profile management
- Doctor profile management
- Healthcare professional discovery
- Appointment booking and management
- Appointment status management
- Patient-doctor communication
- AI-powered mental health and wellness assistant
- Retrieval-Augmented Generation (RAG) for AI responses
- Gemini-powered conversational AI
- Tavily integration for web-based information retrieval
- Markdown support for AI responses
- Syntax highlighting for formatted responses
- Real-time communication support
- Responsive React-based user interface
- Dark mode support
- MongoDB-based data persistence

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- React Markdown
- Remark GFM
- React Syntax Highlighter
- CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- Socket.IO
- WebRTC-related communication support

### AI Backend

- Python
- FastAPI
- Uvicorn
- LangChain
- LangGraph
- Google Gemini
- Tavily
- Retrieval-Augmented Generation (RAG)

### Database

- MongoDB

## Project Structure

```text
Well-Nest/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── socket/
│   │   ├── utils/
│   │   └── app.js
│   ├── package.json
│   └── ...
│
├── ai_backend/
│   ├── app/
│   ├── data/
│   ├── vectorstore/
│   ├── requirements.txt
│   └── ...
│
└── README.md