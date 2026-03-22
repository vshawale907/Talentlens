import re
import unicodedata
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import spacy
from loguru import logger
import nltk

# Ensure NLTK data available
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)

# ─── Skill Dictionaries ────────────────────────────────────────────────────
TECH_SKILLS = {
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "ruby",
    "swift", "kotlin", "scala", "r", "matlab", "php", "dart", "elixir",
    # Frontend
    "react", "vue", "angular", "svelte", "nextjs", "nuxtjs", "redux", "zustand",
    "html", "css", "tailwindcss", "sass", "webpack", "vite",
    # Backend
    "nodejs", "express", "fastapi", "django", "flask", "spring", "rails",
    "graphql", "rest api", "grpc", "websocket",
    # Databases
    "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "sqlite",
    "dynamodb", "cassandra", "neo4j", "pinecone",
    # Cloud & DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
    "ci/cd", "github actions", "jenkins", "nginx", "linux",
    # AI/ML
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow",
    "pytorch", "scikit-learn", "openai", "langchain", "llm", "transformers",
    "pandas", "numpy", "matplotlib", "hugging face",
    # Other
    "git", "agile", "scrum", "microservices", "system design", "data structures",
    "algorithms", "kafka", "rabbitmq", "stripe", "oauth",
}

SOFT_SKILLS = {
    "leadership", "communication", "teamwork", "problem solving", "critical thinking",
    "time management", "adaptability", "creativity", "collaboration", "mentoring",
    "project management", "attention to detail", "analytical", "strategic thinking",
    "decision making", "conflict resolution", "negotiation", "presentation",
    "emotional intelligence", "self-motivated", "organized",
}

ACTION_VERBS = {
    "achieved", "built", "created", "delivered", "designed", "developed", "drove",
    "engineered", "established", "executed", "generated", "implemented", "improved",
    "increased", "launched", "led", "managed", "optimized", "reduced", "scaled",
    "shipped", "solved", "streamlined", "transformed", "architected", "deployed",
    "automated", "collaborated", "contributed", "coordinated", "facilitated",
}

# ─── NLP Engine (Singleton) ───────────────────────────────────────────────
class NLPEngine:
    _instance: Optional["NLPEngine"] = None

    def __init__(self):
        logger.info("Loading spaCy model en_core_web_sm...")
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("en_core_web_sm not found. Downloading...")
            spacy.cli.download("en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")

        self.tfidf = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
            min_df=1,
        )
        logger.info("NLP Engine initialized successfully.")

    @classmethod
    def get_instance(cls) -> "NLPEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ─── Text Cleaning ───────────────────────────────────────────────────
    def clean_text(self, text: str) -> str:
        # Normalize unicode
        text = unicodedata.normalize("NFKD", text)
        # Remove URLs
        text = re.sub(r"https?://\S+|www\.\S+", " ", text)
        # Remove email addresses
        text = re.sub(r"\S+@\S+\.\S+", " ", text)
        # Remove phone numbers
        text = re.sub(r"\+?\d[\d\s\-().]{7,}\d", " ", text)
        # Remove special chars (keep alphanum, spaces, punctuation)
        text = re.sub(r"[^\w\s\-.,/#+]", " ", text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip().lower()
        return text

    # ─── Skill Extraction ────────────────────────────────────────────────
    def extract_skills(self, text: str) -> tuple[list[str], list[str]]:
        text_lower = text.lower()
        tech = sorted([s for s in TECH_SKILLS if s in text_lower])
        soft = sorted([s for s in SOFT_SKILLS if s in text_lower])
        return tech, soft

    # ─── Experience Year Detection ───────────────────────────────────────
    def extract_experience_years(self, text: str) -> int:
        patterns = [
            r"(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp|work)",
            r"experience[:\s]+(\d+)\+?\s*(?:years?|yrs?)",
            r"(\d+)\+?\s*(?:years?|yrs?)\s+(?:in|at|with)",
        ]
        years_found = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            years_found.extend([int(m) for m in matches if int(m) < 50])

        if years_found:
            return max(years_found)

        # Fallback: count date ranges (e.g., 2019-2023)
        date_ranges = re.findall(r"(20\d{2})\s*[-–]\s*(20\d{2}|present|current)", text, re.IGNORECASE)
        if date_ranges:
            import datetime
            current_year = datetime.datetime.now().year
            total = 0
            for start, end in date_ranges:
                end_year = current_year if end.lower() in ("present", "current") else int(end)
                total += max(0, end_year - int(start))
            return min(total, 40)  # cap at 40 years

        return 0

    # ─── TF-IDF Cosine Similarity ────────────────────────────────────────
    def compute_similarity(self, resume_text: str, job_text: str) -> float:
        if not job_text.strip():
            return 0.0
        try:
            corpus = [self.clean_text(resume_text), self.clean_text(job_text)]
            tfidf_matrix = self.tfidf.fit_transform(corpus)
            score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return round(float(score) * 100, 2)
        except Exception as e:
            logger.warning(f"Similarity computation failed: {e}")
            return 0.0

    # ─── Keyword Density ─────────────────────────────────────────────────
    def keyword_density(self, text: str, top_n: int = 20) -> dict[str, float]:
        cleaned = self.clean_text(text)
        tokens = re.findall(r"\b[a-z][a-z+#.]{2,}\b", cleaned)
        from collections import Counter
        from nltk.corpus import stopwords
        try:
            stops = set(stopwords.words("english"))
        except LookupError:
            nltk.download("stopwords", quiet=True)
            stops = set(stopwords.words("english"))

        meaningful = [t for t in tokens if t not in stops and len(t) > 2]
        counter = Counter(meaningful)
        total = sum(counter.values()) or 1
        top = counter.most_common(top_n)
        return {word: round(count / total * 100, 2) for word, count in top}

    # ─── Action Verb Detection ───────────────────────────────────────────
    def detect_action_verbs(self, text: str) -> list[str]:
        text_lower = text.lower()
        found = [v for v in ACTION_VERBS if re.search(rf"\b{v}\b", text_lower)]
        return sorted(found)

    # ─── Named Entity Recognition ────────────────────────────────────────
    def extract_entities(self, text: str) -> dict[str, list[str]]:
        # Process max 100k chars for performance
        doc = self.nlp(text[:100_000])
        entities: dict[str, list[str]] = {"ORG": [], "GPE": [], "PERSON": [], "DATE": []}
        seen: set[str] = set()
        for ent in doc.ents:
            if ent.label_ in entities:
                norm = ent.text.strip()
                if norm not in seen:
                    entities[ent.label_].append(norm)
                    seen.add(norm)
        return entities

    # ─── Skill Gap Detection ─────────────────────────────────────────────
    def skill_gap(self, resume_skills: list[str], job_text: str) -> tuple[list[str], list[str]]:
        jd_lower = job_text.lower()
        jd_tech_skills = [s for s in TECH_SKILLS if s in jd_lower]
        resume_set = set(resume_skills)
        matched = [s for s in jd_tech_skills if s in resume_set]
        missing = [s for s in jd_tech_skills if s not in resume_set]
        return matched, missing

    # ─── Full Analysis Pipeline ───────────────────────────────────────────
    def analyze(self, resume_text: str, job_description: Optional[str] = None) -> dict:
        cleaned_resume = self.clean_text(resume_text)
        tech_skills, soft_skills = self.extract_skills(cleaned_resume)
        experience_years = self.extract_experience_years(resume_text)
        keyword_density = self.keyword_density(cleaned_resume)
        action_verbs = self.detect_action_verbs(resume_text)

        similarity_score = 0.0
        matched_skills: list[str] = []
        missing_skills: list[str] = []

        if job_description:
            similarity_score = self.compute_similarity(resume_text, job_description)
            matched_skills, missing_skills = self.skill_gap(tech_skills, job_description)

        return {
            "extractedSkills": tech_skills,
            "softSkills": soft_skills,
            "experienceYears": experience_years,
            "similarityScore": similarity_score,
            "matchedSkills": matched_skills,
            "missingSkills": missing_skills,
            "keywordDensity": keyword_density,
            "actionVerbs": action_verbs,
        }
