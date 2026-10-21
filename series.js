export const COL_CLASS = 'Class';
export const COL_NAME = 'Name';
export const COL_CLASS_RANK = 'Class Rank';
export const COL_INDIV_CLASS_RANK = 'Indiv. Class Rank';
export const COL_INDIVIDUAL_CLASS_RANK = 'Individual Class Rank';

// --- 1. Basic TSV Parser ---
export function parseTSV(text) {
    if (!text || !text.trim()) return [];
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if ('\t' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret.filter(r => r.some(cell => cell.trim() !== ''));
}

// --- 2. Extract Year from Race ---
export function getRaceYear(race) {
    if (!race) return null;
    if (race.date && typeof race.date === 'string') {
        const match = race.date.trim().match(/^(\d{4})/);
        if (match) return match[1];
    }
    if (race.name && typeof race.name === 'string') {
        const match = race.name.match(/\b(19\d{2}|20\d{2})\b/);
        if (match) return match[1];
    }
    return null;
}

// --- 3. Get Unique Years Sorted Descending (Most Recent First) ---
export function getUniqueYears(races) {
    if (!Array.isArray(races)) return [];
    const years = new Set();
    races.forEach(race => {
        const year = getRaceYear(race);
        if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
}

// --- 4. Get Races for Selected Year (Sorted Chronologically Ascending) ---
export function getRacesForYear(races, year) {
    if (!Array.isArray(races) || !year) return [];
    const yearStr = String(year);
    return races
        .filter(race => getRaceYear(race) === yearStr)
        .sort((a, b) => {
            const dA = a.date || '';
            const dB = b.date || '';
            return dA.localeCompare(dB);
        });
}

// --- 5. Build Google Sheets TSV Export URL ---
export function getTsvExportUrl(resultsUrl) {
    if (!resultsUrl) return '';
    const idMatch = resultsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = idMatch ? idMatch[1] : '';
    if (!sheetId) return resultsUrl;

    const gidMatch = resultsUrl.match(/[?&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv&gid=${gid}&t=${new Date().getTime()}`;
}

// --- 6. Normalize Class and Racer Names ---
export function normalizeClassName(cls) {
    if (!cls) return '';
    const trimmed = cls.trim();
    if (/^K-1\s+Master\s+Men\s*\(40\+\)$/i.test(trimmed)) {
        return 'K-1 Master Men';
    }
    if (/^K-1\s+Master\s+Women\s*\(40\+\)$/i.test(trimmed)) {
        return 'K-1 Master Women';
    }
    if (/^K-1\s+Grand\s+Masters?(\s+(Men|Women))?(\s*\(65\+\))?$/i.test(trimmed)) {
        return 'K-1 Grand Masters';
    }
    return trimmed;
}

export function normalizeRacerName(name) {
    if (!name) return '';
    const trimmed = name.trim();
    if (trimmed.includes('&')) {
        const parts = trimmed.split('&').map(p => p.trim()).filter(Boolean);
        if (parts.length > 1) {
            return parts.sort((a, b) => a.localeCompare(b)).join(' & ');
        }
    }
    return trimmed;
}

// --- 7. Parse Race TSV into Ranked Rows ---
export function parseRaceTSV(tsvText) {
    const lines = parseTSV(tsvText);
    if (lines.length === 0) return [];

    // Look for headers in row 1 (index 0), or fallback to row 2 (index 1)
    let headerIdx = 0;
    const hasRequiredHeaders = (row) => {
        const trimmed = row.map(c => c.trim());
        return trimmed.includes(COL_CLASS) && trimmed.includes(COL_NAME);
    };

    if (!hasRequiredHeaders(lines[0]) && lines.length > 1 && hasRequiredHeaders(lines[1])) {
        headerIdx = 1;
    }

    const headers = lines[headerIdx].map(h => h.trim());
    const classIdx = headers.indexOf(COL_CLASS);
    const nameIdx = headers.indexOf(COL_NAME);
    const classRankIdx = headers.indexOf(COL_CLASS_RANK);
    let indivRankIdx = headers.indexOf(COL_INDIV_CLASS_RANK);
    if (indivRankIdx === -1) {
        indivRankIdx = headers.indexOf(COL_INDIVIDUAL_CLASS_RANK);
    }

    if (classIdx === -1 || nameIdx === -1 || classRankIdx === -1) {
        return [];
    }

    const results = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const row = lines[i];
        if (indivRankIdx !== -1) {
            const indivRank = (row[indivRankIdx] || '').trim();
            if (indivRank !== '1') continue;
        }

        const cls = normalizeClassName(row[classIdx] || '');
        const name = normalizeRacerName(row[nameIdx] || '');
        const classRank = (row[classRankIdx] || '').trim();

        if (!cls || !name) continue;

        results.push({
            [COL_CLASS]: cls,
            [COL_NAME]: name,
            [COL_CLASS_RANK]: classRank
        });
    }

    return results;
}

// --- 8. Calculate Points from Class Rank ---
export function rankToPoints(rank) {
    if (rank === null || rank === undefined || rank === '') return '';
    const num = parseInt(String(rank).trim(), 10);
    if (isNaN(num) || num < 1) return '';
    const pointsMap = {
        1: 10,
        2: 8,
        3: 6,
        4: 5,
        5: 4,
        6: 3,
        7: 2
    };
    return pointsMap[num] ?? 1;
}

// --- 9. Build Series Standings Table Data ---
// raceResultsList: Array of { name?: string, abbrev?: string, rows: Array<{ Class, Name, 'Class Rank' }> }
export function buildSeriesData(raceResultsList) {
    if (!Array.isArray(raceResultsList)) {
        return { raceNames: [], totalRaces: 0, minRacesToQualify: 0, allRacesRacers: [], classes: [] };
    }

    const raceNames = raceResultsList.map(r => r.abbrev || r.name || '');
    // classMap: className -> Map(racerName -> Map(raceIndex -> classRank))
    const classMap = new Map();
    // racerAllRacesMap: racerName -> Set(raceIndex) across all classes
    const racerAllRacesMap = new Map();

    const recordRacerInRace = (racerName, raceIdx) => {
        if (!racerAllRacesMap.has(racerName)) {
            racerAllRacesMap.set(racerName, new Set());
        }
        racerAllRacesMap.get(racerName).add(raceIdx);
    };

    raceResultsList.forEach((race, raceIdx) => {
        const rows = race.rows || [];
        rows.forEach(row => {
            const cls = normalizeClassName(row[COL_CLASS] || '');
            const name = normalizeRacerName(row[COL_NAME] || '');
            const rank = (row[COL_CLASS_RANK] || '').toString().trim();

            if (!cls || !name) return;

            if (!classMap.has(cls)) {
                classMap.set(cls, new Map());
            }
            const racerMap = classMap.get(cls);
            if (!racerMap.has(name)) {
                racerMap.set(name, new Map());
            }
            if (rank !== '') {
                racerMap.get(name).set(raceIdx, rank);
                if (name.includes('&')) {
                    name.split('&').map(p => p.trim()).filter(Boolean).forEach(part => {
                        recordRacerInRace(part, raceIdx);
                    });
                } else {
                    recordRacerInRace(name, raceIdx);
                }
            }
        });
    });

    const totalRaces = raceResultsList.length;
    const minRacesToQualify = totalRaces > 0 ? Math.floor(totalRaces / 2) + 1 : 0;

    const allRacesRacers = totalRaces > 0
        ? Array.from(racerAllRacesMap.entries())
            .filter(([, racesSet]) => racesSet.size === totalRaces)
            .map(([racerName]) => racerName)
            .sort((a, b) => a.localeCompare(b))
        : [];

    const sortedClassNames = Array.from(classMap.keys()).sort((a, b) => a.localeCompare(b));

    const classes = sortedClassNames.map(className => {
        const racerMap = classMap.get(className);
        const racerNames = Array.from(racerMap.keys());

        const racers = racerNames.map(racerName => {
            const ranksByRace = racerMap.get(racerName);
            const ranks = raceResultsList.map((_, idx) => ranksByRace.get(idx) || '');
            const points = ranks.map(r => rankToPoints(r));
            const numericPoints = points.filter(p => typeof p === 'number' && !isNaN(p));
            const totalPoints = numericPoints.reduce((sum, p) => sum + p, 0);
            const bestOf4Points = [...numericPoints]
                .sort((a, b) => b - a)
                .slice(0, 4)
                .reduce((sum, p) => sum + p, 0);

            return {
                name: racerName,
                ranks,
                points,
                totalPoints,
                bestOf4Points,
                racesCount: numericPoints.length,
                seriesRank: ''
            };
        });

        racers.sort((a, b) => {
            if (b.bestOf4Points !== a.bestOf4Points) {
                return b.bestOf4Points - a.bestOf4Points;
            }
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            return a.name.localeCompare(b.name);
        });

        let nextRank = 1;
        racers.forEach(racer => {
            if (nextRank <= 3 && totalRaces > 0 && racer.racesCount >= minRacesToQualify) {
                racer.seriesRank = nextRank;
                nextRank++;
            }
        });

        return {
            className,
            racers
        };
    });

    return {
        raceNames,
        totalRaces,
        minRacesToQualify,
        allRacesRacers,
        classes
    };
}

