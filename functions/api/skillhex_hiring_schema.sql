CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  headline TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_skills (
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_score REAL NOT NULL CHECK (skill_score BETWEEN 0 AND 100),
  skill_graph_json TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  repo_url TEXT,
  relevance_score REAL DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT,
  provider TEXT,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  taken_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS coding_problems (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT,
  platform TEXT,
  problem_title TEXT,
  difficulty TEXT,
  score REAL DEFAULT 0,
  solved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS peer_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT,
  reviewer_name TEXT,
  rating REAL CHECK (rating BETWEEN 0 AND 5),
  feedback TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  primary_skill TEXT NOT NULL,
  min_skill_score REAL DEFAULT 70,
  skill_score_weight REAL DEFAULT 0.5,
  project_score_weight REAL DEFAULT 0.3,
  assessment_score_weight REAL DEFAULT 0.2,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  match_score REAL NOT NULL,
  matched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id, candidate_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (candidate_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_score ON candidate_skills(skill_id, skill_score DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_skill ON projects(user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_skill ON assessments(user_id, skill_id);
