# InterviewForge

InterviewForge is an AI-powered interview preparation platform that helps candidates analyze job descriptions, generate personalized interview plans, identify skill gaps, and create tailored resumes.

## Features

* AI-generated interview preparation reports
* Technical and behavioral interview questions
* Candidate-job match scoring
* Skill gap analysis
* Personalized preparation roadmap
* AI-powered resume generation
* Secure authentication and user management
* PDF resume export

## Tech Stack

### Frontend

* React
* Vite
* SCSS
* React Router

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication

### AI & Automation

* Google Generative AI
* Puppeteer
* Zod Validation

## Project Structure

```text
InterviewForge/
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── middleware/
│   └── server.js
│
├── Frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── contexts/
│   │   └── services/
│   └── app.routes.jsx
│
└── README.md
```

## Environment Variables

Create a `.env` file inside the `Backend` directory:

```env
MONGO_URI=
JWT_SECRET=
GOOGLE_GENAI_API_KEY=
PUPPETEER_EXECUTABLE_PATH=
```

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd InterviewForge

cd Backend
npm install

cd ../Frontend
npm install
```

## Running the Application

### Start Backend

```bash
cd Backend
npm run dev
```

### Start Frontend

```bash
cd Frontend
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:3000
```

## API Modules

### Authentication

* User Registration
* User Login
* User Logout
* Current User Profile

### Interview Management

* Generate Interview Reports
* Retrieve Interview Reports
* View Detailed Reports
* Generate Resume PDFs

## How It Works

1. Upload your resume.
2. Provide a job description and self-description.
3. AI analyzes your profile against the target role.
4. Generate:

   * Match Score
   * Technical Questions
   * Behavioral Questions
   * Skill Gap Analysis
   * Preparation Plan
5. Create a tailored resume in PDF format.

## Future Enhancements

* Mock interview sessions
* Voice-based interview practice
* ATS resume scoring
* Interview performance analytics
* Multi-model AI support




