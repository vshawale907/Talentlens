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

SKILL_ALIASES = {
    "machine learning": ["ml", "machinelearning"],
    "deep learning": ["dl", "deeplearning"],
    "artificial intelligence": ["ai"],
    "natural language processing": ["nlp"],
    "amazon web services": ["aws"],
    "google cloud platform": ["gcp"],
    "javascript": ["js"],
    "typescript": ["ts"],
    "react": ["react.js", "reactjs", "react js"],
    "nodejs": ["node.js", "node js", "node"],
    "vue": ["vue.js", "vuejs", "vue js"],
    "postgresql": ["postgres", "psql"],
    "kubernetes": ["k8s"],
    "ci/cd": ["ci", "cd", "ci-cd"],
    "user interface": ["ui"],
    "user experience": ["ux"],
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
        
        # Replace aliases with canonical forms for TF-IDF accurate matching
        for canonical, aliases in SKILL_ALIASES.items():
            for alias in aliases:
                esc_alias = re.escape(alias)
                # Boundary aware replacement
                text = re.sub(rf"(?:^|[^\w#+]){esc_alias}(?:$|[^\w#+])", f" {canonical} ", text)
                
        # Final whitespace normalization after alias replacement
        text = re.sub(r"\s+", " ", text).strip()
        return text

    # ─── Skill Extraction ────────────────────────────────────────────────
    def extract_skills(self, text: str) -> tuple[list[str], list[str]]:
        text_lower = text.lower()
        def is_match(skill):
            # Escape string and use lookaround to ensure it's not part of another word.
            # We use [^\w#+] to not break things like c++ and c#
            escaped = re.escape(skill)
            if re.search(rf"(?:^|[^\w#+]){escaped}(?:$|[^\w#+])", text_lower):
                return True
            # Check aliases
            aliases = SKILL_ALIASES.get(skill, [])
            for alias in aliases:
                esc_alias = re.escape(alias)
                if re.search(rf"(?:^|[^\w#+]){esc_alias}(?:$|[^\w#+])", text_lower):
                    return True
            return False

        tech = sorted([s for s in TECH_SKILLS if is_match(s)])
        soft = sorted([s for s in SOFT_SKILLS if is_match(s)])
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

        # Fallback: Count nuanced date ranges (e.g., "Jan '20 - Current")
        import datetime
        current_year = datetime.datetime.now().year
        total = 0

        months_regex = r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
        year_regex = r"(?:20\d{2}|['‘’]\d{2})"
        date_expr = rf"(?:{months_regex}\s*)?{year_regex}"
        
        range_pattern = rf"({date_expr})\s*(?:[-–]|to|until)\s*({date_expr}|present|current|now)"
        
        def parse_year(s: str) -> int:
            if not s: return 0
            s_lower = s.lower()
            if "present" in s_lower or "current" in s_lower or "now" in s_lower:
                return current_year
            m4 = re.search(r"\b(20\d{2})\b", s)
            if m4: return int(m4.group(1))
            m2 = re.search(r"['‘’](\d{2})\b", s)
            if m2: return 2000 + int(m2.group(1))
            return 0

        for match in re.finditer(range_pattern, text, re.IGNORECASE):
            start_str = match.group(1)
            end_str = match.group(2)
            start_y = parse_year(start_str)
            end_y = parse_year(end_str)
            if start_y > 1990 and end_y >= start_y:
                diff = end_y - start_y
                total += diff if diff > 0 else 1

        return min(total, 40) if total > 0 else 0

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
        
        def is_in_text(skill, text):
            escaped = re.escape(skill)
            if re.search(rf"(?:^|[^\w#+]){escaped}(?:$|[^\w#+])", text): return True
            aliases = SKILL_ALIASES.get(skill, [])
            for alias in aliases:
                esc_alias = re.escape(alias)
                if re.search(rf"(?:^|[^\w#+]){esc_alias}(?:$|[^\w#+])", text): return True
            return False

        jd_tech_skills = [s for s in TECH_SKILLS if is_in_text(s, jd_lower)]
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
