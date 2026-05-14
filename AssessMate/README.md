# AssessMate - AI Integrated Learning & Assessment Platform

AssessMate is a modern, high-performance web application designed for students and teachers to facilitate learning through automated test generation, AI-powered evaluation, and a comprehensive digital library of textbooks.

## 🚀 Features

- **AI Test Builder**: Generate customized tests based on subjects, chapters, and difficulty levels.
- **Mate AI**: An intelligent chat assistant that provides hints and guidance during assessments.
- **Digital Library**: Instant access to CBSE and State Board textbooks (Classes X & XII).
- **Teacher Dashboard**: Create shareable test codes and monitor student performance with AI-graded results.
- **Analytics**: Detailed performance tracking including critical thinking and efficiency scores.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite.
- **AI Integration**: Google Gemini API for test generation and evaluation.

## 📦 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/AssessMate.git
cd AssessMate
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory and add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=a_secure_random_string
```

### 3. Setup Digital Library (Crucial)
To keep the repository lightweight, the textbook PDFs in the `Resources/` folder are not included in the git history.
1. Download the `Resources.zip` from [Your Provided Link].
2. Extract the contents into the root directory of the project.
3. Your folder structure should look like this:
   ```
   AssessMate/
   ├── Resources/
   │   ├── CBSE/
   │   └── State Board/
   ├── backend/
   ├── frontend/
   └── ...
   ```

### 4. Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 5. Running the Application
You can use the provided `run.bat` (on Windows) or start services manually:

**Backend:**
```bash
cd backend
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to start using AssessMate!

---
Developed as a final project for Sem 2.
