// --- Constants ---
export const COL_BIB = 'Bib #';
export const COL_NAME = 'Name';
export const COL_CLASS = 'Class';
export const COL_TIME = 'Raw Time';
export const COL_SCORE = 'Total Score';

export const MIN_TIME_SAMPLE = 10;
export const MAX_TIME_SAMPLE = 900;

// --- 1. CSV Parser ---
export function parseCSV(text) {
    if (!text || !text.trim()) return { headers: [], rows: [] };
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 1) return { headers: [], rows: [] };

    const splitRow = (row) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(v => v.replace(/^"|"$/g, ''));
    };

    let headerIdx = 1; // Default to row 2
    if (lines[0]) {
        const firstRowCols = splitRow(lines[0]);
        if (firstRowCols.includes(COL_BIB)) {
            headerIdx = 0;
        }
    }

    const headers = splitRow(lines[headerIdx]);
    const results = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = splitRow(lines[i]);
        const obj = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = values[index] || '';
            }
        });
        results.push(obj);
    }
    return { headers, rows: results };
}

// --- 2. Parse to Numeric Seconds ---
export function parseToNumeric(val) {
    if (!val) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.includes(':')) {
        const parts = val.split(':').map(Number);
        if (parts.length === 2) return (parts[0] * 60) + parts[1];
        if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

// --- 3. Format Bytes ---
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- 4. Process Results Data (Filters) ---
export function checkStationAnomalies(rows) {
    if (!rows || rows.length === 0) return [];

    // 1. Find columns
    const firstRow = rows[0];
    const bibKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'bib #' || k.toLowerCase() === 'bib' || k.toLowerCase() === 'bib number');
    const stationKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'station' || k.toLowerCase() === 'station name');
    const timeKey = Object.keys(firstRow).find(k => k.toLowerCase() === 'timestamp' || k.toLowerCase() === 'submission time' || k.toLowerCase() === 'time');

    if (!bibKey || !stationKey || !timeKey) {
        return []; // Cannot perform check without these columns
    }

    // Helper to get timestamp in ms
    const getTimestampMs = (val) => {
        if (!val) return 0;
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.getTime();
        }
        if (typeof val === 'string' && val.includes(':')) {
            const parts = val.split(':').map(Number);
            if (parts.length === 3) {
                return ((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000;
            }
            if (parts.length === 2) {
                return ((parts[0] * 60) + parts[1]) * 1000;
            }
        }
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    // Helper to normalize station names
    const normalizeStation = (name) => {
        if (!name) return '';
        const clean = name.toString().trim();
        if (/^(Station\s+)?A$/i.test(clean)) return 'Station A';
        if (/^(Station\s+)?B$/i.test(clean)) return 'Station B';
        if (/^(Station\s+)?C$/i.test(clean)) return 'Station C';
        if (/^(Station\s+)?D$/i.test(clean)) return 'Station D';
        if (/^Finish$/i.test(clean)) return 'Finish';
        return clean;
    };

    // 2. Group rows by Bib #
    const bibGroups = {};
    rows.forEach(row => {
        const bib = (row[bibKey] || '').toString().trim();
        if (bib) {
            if (!bibGroups[bib]) {
                bibGroups[bib] = [];
            }
            bibGroups[bib].push(row);
        }
    });

    const anomalies = [];
    const expectedStations = ['Station A', 'Station B', 'Station C', 'Station D', 'Finish'];

    // 3. For each Bib #, group into runs
    Object.keys(bibGroups).forEach(bib => {
        // Find if any row in this bib group has a Run # column
        const runKey = Object.keys(bibGroups[bib][0]).find(k => k.toLowerCase() === 'run #' || k.toLowerCase() === 'run');
        
        let runGroupsList = [];

        if (runKey) {
            // Group by the spreadsheet's computed Run #
            const runGroupsMap = {};
            bibGroups[bib].forEach(row => {
                const runNum = (row[runKey] || '1').toString().trim();
                if (runNum && runNum !== '0') {
                    if (!runGroupsMap[runNum]) {
                        runGroupsMap[runNum] = [];
                    }
                    runGroupsMap[runNum].push({ row, timeMs: getTimestampMs(row[timeKey]) });
                }
            });
            
            // Sort each run's rows chronologically
            Object.keys(runGroupsMap).sort().forEach(runNum => {
                runGroupsMap[runNum].sort((a, b) => a.timeMs - b.timeMs);
                runGroupsList.push({
                    runNum: runNum,
                    group: runGroupsMap[runNum]
                });
            });
        } else {
            // Fallback to grouping by 10-minute gap
            const sorted = bibGroups[bib]
                .map(row => ({ row, timeMs: getTimestampMs(row[timeKey]) }))
                .sort((a, b) => a.timeMs - b.timeMs);

            let currentGroup = [];
            let chronologicalIndex = 1;
            sorted.forEach(item => {
                if (currentGroup.length === 0) {
                    currentGroup.push(item);
                } else {
                    const lastItem = currentGroup[currentGroup.length - 1];
                    if (item.timeMs - lastItem.timeMs < 10 * 60 * 1000) {
                        currentGroup.push(item);
                    } else {
                        runGroupsList.push({
                            runNum: chronologicalIndex.toString(),
                            group: currentGroup
                        });
                        chronologicalIndex++;
                        currentGroup = [item];
                    }
                }
            });
            if (currentGroup.length > 0) {
                runGroupsList.push({
                    runNum: chronologicalIndex.toString(),
                    group: currentGroup
                });
            }
        }

        // 4. Validate each run group
        runGroupsList.forEach(({ runNum, group }) => {
            // Check if this run has a Finish time of 999.00
            const finishRow = group.find(item => normalizeStation(item.row[stationKey]) === 'Finish');
            let is999 = false;
            if (finishRow) {
                const timeKeys = ['converted time', 'raw time', 'time'];
                const matchedKey = Object.keys(finishRow.row).find(k => timeKeys.includes(k.toLowerCase()));
                if (matchedKey) {
                    const timeVal = parseToNumeric(finishRow.row[matchedKey]);
                    if (timeVal === 999) {
                        is999 = true;
                    }
                }
            }

            if (is999) return;

            const stationsInRun = group.map(item => normalizeStation(item.row[stationKey]));

            const missing = expectedStations.filter(s => !stationsInRun.includes(s));
            
            const counts = {};
            stationsInRun.forEach(s => {
                if (s) counts[s] = (counts[s] || 0) + 1;
            });

            const extra = [];
            stationsInRun.forEach(s => {
                if (s && !expectedStations.includes(s) && !extra.includes(s)) {
                    extra.push(s);
                }
            });
            expectedStations.forEach(s => {
                if (counts[s] > 1 && !extra.includes(s)) {
                    extra.push(s);
                }
            });

            if (missing.length > 0 || extra.length > 0) {
                const parts = [];
                if (missing.length > 0) {
                    parts.push(`missing: ${missing.join(', ')}`);
                }
                if (extra.length > 0) {
                    parts.push(`extra: ${extra.join(', ')}`);
                }
                anomalies.push({
                    bib,
                    run: runNum,
                    message: `Bib ${bib} Run ${runNum}: ${parts.join('; ')}`
                });
            }
        });
    });

    return anomalies;
}

export function processResultsData(rows) {
    const errorData = rows.filter(row => {
        const runNum = (row['Run #'] || row['Run'] || '1').toString().trim();
        const time = parseToNumeric(row[COL_TIME]);
        return (runNum !== '1' && runNum !== '2') || time === 0;
    });

    const allData = rows.filter(row => {
        const time = parseToNumeric(row[COL_TIME]);
        return time === null || (time >= MIN_TIME_SAMPLE && time <= MAX_TIME_SAMPLE);
    });

    const anomalies = checkStationAnomalies(rows);

    return { allData, errorData, anomalies };
}
