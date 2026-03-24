export interface SectionStatus {
    name: string;
    status: 'present' | 'weak' | 'missing';
    tip: string;
}

export interface ReadabilityMetrics {
    fkGrade: number;
    avgSentenceLength: number;
    actionVerbCount: number;
    totalBullets: number;
    passiveBullets: string[];
}

const ACTION_VERBS = new Set([
    'led','built','designed','engineered','architected','launched',
    'reduced','increased','improved','automated','deployed','scaled',
    'optimized','delivered','managed','created','developed','implemented',
    'drove','spearheaded','orchestrated','championed','streamlined',
    'mentored','directed','executed','established','founded','analyzed',
    'resolved','transformed','modernized','integrated','secured','configured',
    'migrated','tested','debugged','accelerated','maximized','minimized'
]);

const SECTIONS = [
    { name: 'Summary / Objective', keywords: ['summary', 'objective', 'profile', 'about'] },
    { name: 'Work Experience', keywords: ['experience', 'employment', 'work history', 'professional experience'] },
    { name: 'Skills', keywords: ['skills', 'technologies', 'tech stack', 'technical skills'] },
    { name: 'Education', keywords: ['education', 'university', 'degree', 'bachelor', 'master', 'academic'] },
    { name: 'Projects', keywords: ['projects', 'portfolio', 'built', 'developed'] },
    { name: 'Certifications', keywords: ['certification', 'certified', 'license', 'credential', 'courses'] },
];

export function computeSectionCompleteness(rawText: string): number {
    const textBase = rawText.toLowerCase();
    let found = 0;
    
    for (const section of SECTIONS) {
        if (section.keywords.some(k => textBase.includes(k))) {
            found++;
        }
    }
    
    return Math.round((found / SECTIONS.length) * 25);
}

export function countQuantifiedBullets(rawText: string): number {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
    // Simple heuristic: look for numbers, %, $, or typical quantification words
    const regex = /\b\d+[%$xk+]?|\b\d+\s?(percent|million|thousand|users|clients)\b/i;
    let count = 0;
    
    for (const line of lines) {
        if (regex.test(line)) count++;
    }
    return count;
}

export function checkResumeSections(rawText: string): SectionStatus[] {
    const textBase = rawText.toLowerCase();
    return SECTIONS.map(section => {
        let foundKeyword = '';
        let index = -1;
        
        for (const k of section.keywords) {
            const idx = textBase.indexOf(k);
            if (idx !== -1 && (index === -1 || idx < index)) {
                index = idx;
                foundKeyword = k;
            }
        }

        if (index === -1) {
            return {
                name: section.name,
                status: 'missing',
                tip: `Add a dedicated "${section.name}" section.`
            };
        }

        const trailingWords = textBase.slice(index + foundKeyword.length).split(/\s+/).slice(0, 50);
        const actualWords = trailingWords.filter(w => w.length > 0).length;

        if (actualWords < 15) {
            return {
                name: section.name,
                status: 'weak',
                tip: 'Section spotted, but it lacks depth. Expand on it.'
            };
        }

        return {
            name: section.name,
            status: 'present',
            tip: 'Looks solid.'
        };
    });
}

function estimateSyllables(text: string): number {
    return text.toLowerCase().split(/\s+/).reduce((count, word) => {
        const matches = word.match(/[aeiouy]+/g);
        return count + (matches ? matches.length : 1);
    }, 0);
}

export function computeReadability(rawText: string, bullets: string[]): ReadabilityMetrics {
    const words = rawText.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const wordCount = Math.max(1, words.length);
    const sentenceCount = Math.max(1, sentences.length);
    const syllables = estimateSyllables(rawText);
    
    // Flesch-Kincaid Grade Level
    let fkGrade = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllables / wordCount) - 15.59;
    fkGrade = Math.max(0, Math.round(fkGrade * 10) / 10);
    
    const avgSentenceLength = Math.round(wordCount / sentenceCount);

    let actionVerbCount = 0;
    const passiveBullets: string[] = [];

    for (const bullet of bullets) {
        const bWords = bullet.trim().split(/\s+/);
        if (bWords.length > 0 && ACTION_VERBS.has(bWords[0].toLowerCase().replace(/[^a-z]/g, ''))) {
            actionVerbCount++;
        }

        if (/\b(was|were|been|being)\s+\w+ed\b/i.test(bullet)) {
            passiveBullets.push(bullet);
        }
    }

    return {
        fkGrade,
        avgSentenceLength,
        actionVerbCount,
        totalBullets: bullets.length,
        passiveBullets
    };
}

export function categorizeSkills(extractedSkills: string[]) {
    const languages = new Set(['javascript','typescript','python','java','c++','cpp','c#','csharp','ruby','go','golang','rust','swift','kotlin','php','rust','sql','r','scala','bash','shell']);
    const frameworks = new Set(['react','angular','vue','svelte','nextjs','express','django','flask','spring','springboot','rails','laravel','fastapi','docker','kubernetes','aws','azure','gcp','terraform','graphql','rest','redux','tailwind']);

    const cats = {
        Languages: [] as string[],
        'Frameworks & Tools': [] as string[],
        Concepts: [] as string[]
    };

    for (const skill of extractedSkills) {
        const lower = skill.toLowerCase().replace(/\s|\./g, '');
        if (languages.has(lower)) {
            cats.Languages.push(skill);
        } else if (frameworks.has(lower) || skill.toLowerCase().includes('js')) {
            cats['Frameworks & Tools'].push(skill);
        } else {
            cats.Concepts.push(skill);
        }
    }

    return cats;
}
