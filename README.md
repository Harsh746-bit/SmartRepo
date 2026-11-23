# CampusConnect – Smart Repository Management System

An intelligent, role-based academic document repository management system engineered with **FastAPI**, **React 19**, and **MongoDB Atlas**.

---

## Key Features

- **Role-Based Access Control (RBAC)**: Dedicated workspaces, permissions, and dashboards for **Students**, **Faculty / Teachers**, and **Administrators**.
- **Multi-Tier Content Deduplication**:
  - Streaming SHA-256 cryptographic digest.
  - Normalized extracted text hashing.
  - Fuzzy sequence similarity matching ($\ge 88\%$) to detect plagiarism/duplicate submissions across different filenames.
- **Intelligent Semantic Search**: Deep search across document filenames, authors, categories, extracted text, and academic keyword synonyms.
- **Academic Moderation Workflow**: Submissions undergo administrative review with approval, rejection, feedback rationale, and live status badges.
- **Safe Two-Stage Deletion (Recycle Bin)**:
  - Soft deletion with active/recycle bin separation.
  - Instant document restoration.
  - Permanent file purge from disk and cloud database with confirmation safeguards.
- **Analytics & Activity Auditing**: Track storage capacity, downloads, user distribution, and security events.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Lucide Icons, CSS3 Variables |
| **Backend** | FastAPI, Python 3.11+, Uvicorn, PyPDF |
| **Database** | MongoDB Atlas (Multi-collection, indexed) |
| **DevOps** | Docker, Docker Compose, Nginx, Render Blueprint |

---

## Getting Started

### 1. Clone Repository
```bash
git clone https://github.com/Harsh746-bit/SmartRepo.git
cd SmartRepo
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Docker Deployment (Turnkey)

Run the full stack with persistent volume storage in a single command:

```bash
docker compose up -d --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs`

---

## Default Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@smartrepo.edu` | `admin123` |
| **Student** | `parth@gmail.com` | `admin123` |
| **Teacher** | `omkar@gmail.com` | `admin123` |
