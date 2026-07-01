// --- 1. Basic TSV Parser ---
export function parseTSV(text) {
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
    return ret;
}

// --- 2. Simulated Annealing for Constrained Optimization ---
export function runSimulatedAnnealing(N_CLASSES, racerClassArray, classBoatArray, maxDiff, timeLimitMs = 500) {
    function evaluate(state) {
        let boatsA = 0, boatsB = 0;
        for (let i = 0; i < N_CLASSES; i++) {
            if (state[i]) boatsA += classBoatArray[i];
            else boatsB += classBoatArray[i];
        }
        let diff = Math.abs(boatsA - boatsB);

        let overlap = 0;
        for (let i = 0; i < racerClassArray.length; i++) {
            let hasA = false, hasB = false;
            for (let j = 0; j < racerClassArray[i].length; j++) {
                if (state[racerClassArray[i][j]]) hasA = true;
                else hasB = true;
            }
            if (hasA && hasB) overlap++;
        }

        let valid = diff <= maxDiff;
        let cost = overlap * 10000 + diff;

        if (!valid) {
            cost += 10000000 + diff * 100000;
        }
        return { cost, overlap, diff, boatsA, boatsB, valid };
    }

    let bestGlobalState = null;
    let bestGlobalEval = { cost: Infinity };
    let startTime = Date.now();

    while (Date.now() - startTime < timeLimitMs) {
        let state = Array.from({ length: N_CLASSES }, () => Math.random() > 0.5);
        let currentEval = evaluate(state);

        let temp = 100.0;
        const minTemp = 0.001;
        const alpha = 0.95;

        while (temp > minTemp && Date.now() - startTime < timeLimitMs) {
            for (let i = 0; i < 500; i++) {
                let flip1 = Math.floor(Math.random() * N_CLASSES);
                let flip2 = -1;

                if (Math.random() < 0.5 && N_CLASSES > 1) {
                    flip2 = Math.floor(Math.random() * N_CLASSES);
                    let attempts = 0;
                    while (state[flip1] === state[flip2] && attempts < 5) {
                        flip2 = Math.floor(Math.random() * N_CLASSES);
                        attempts++;
                    }
                    if (state[flip1] === state[flip2]) flip2 = -1;
                }

                state[flip1] = !state[flip1];
                if (flip2 !== -1) state[flip2] = !state[flip2];

                let nextEval = evaluate(state);

                if (nextEval.cost < currentEval.cost || Math.exp((currentEval.cost - nextEval.cost) / temp) > Math.random()) {
                    currentEval = nextEval;
                    if (currentEval.cost < bestGlobalEval.cost) {
                        bestGlobalEval = currentEval;
                        bestGlobalState = [...state];
                    }
                } else {
                    state[flip1] = !state[flip1];
                    if (flip2 !== -1) state[flip2] = !state[flip2];
                }
            }
            temp *= alpha;
        }
    }
    return { state: bestGlobalState || Array(N_CLASSES).fill(true), eval: bestGlobalEval };
}

// --- 3. Parse Missing Bibs (Pure Function) ---
export function parseMissingBibs(val) {
    const missing = new Set();
    if (!val) return missing;

    const tokens = val.split(/[,\s]+/);
    for (let token of tokens) {
        token = token.trim();
        if (!token) continue;

        if (token.includes('-')) {
            const parts = token.split('-');
            if (parts.length === 2) {
                const start = parseInt(parts[0], 10);
                const end = parseInt(parts[1], 10);
                if (!isNaN(start) && !isNaN(end)) {
                    const low = Math.min(start, end);
                    const high = Math.max(start, end);
                    for (let n = low; n <= high; n++) {
                        missing.add(n);
                    }
                }
            }
        } else {
            const num = parseInt(token, 10);
            if (!isNaN(num)) {
                missing.add(num);
            }
        }
    }
    return missing;
}

// --- 4. Work Assignment Logic (Pure Function) ---
export function assignWork(racers, isSingleSession = false) {
    const result = [];
    const N = racers.length;
    if (N === 0) return result;
    
    let assignments = [];
    
    if (isSingleSession) {
        const stations = ["Finish", "Station A", "Station B", "Station C", "Station D"];
        const stationCounts = [0, 0, 0, 0, 0];
        for (let i = 0; i < N; i++) {
            stationCounts[i % 5]++;
        }
        for (let sIdx = 0; sIdx < 5; sIdx++) {
            for (let j = 0; j < stationCounts[sIdx]; j++) {
                assignments.push(stations[sIdx]);
            }
        }
    } else {
        const numFinish = Math.min(N, 3);
        for (let i = 0; i < numFinish; i++) {
            assignments.push("Finish");
        }
        
        const remaining = N - numFinish;
        const stations = ["Station A", "Station B", "Station C", "Station D"];
        
        if (remaining > 0) {
            const numStations = Math.min(remaining, 12);
            const stationCounts = [0, 0, 0, 0];
            for (let i = 0; i < numStations; i++) {
                stationCounts[i % 4]++;
            }
            
            for (let sIdx = 0; sIdx < 4; sIdx++) {
                for (let j = 0; j < stationCounts[sIdx]; j++) {
                    assignments.push(stations[sIdx]);
                }
            }
        }
        
        while (assignments.length < N) {
            assignments.push("");
        }
    }
    
    for (let i = 0; i < N; i++) {
        result.push({
            name: racers[i],
            assignment: assignments[i]
        });
    }
    
    return result;
}

// --- 5. Main Optimization Orchestrator (Pure Function) ---
export function optimizeSessions({ csvText, maxDiff = 5, isSingleSession = false }) {
    let lines = parseTSV(csvText);
    if (lines.length < 2) throw new Error("Registration data has no data rows.");

    let header = lines[0].map(h => (h || '').toLowerCase().trim());
    let nameIdx = header.findIndex(h => h.includes('name'));
    let classesIdx = header.findIndex(h => h.includes('class'));
    let partnersIdx = header.findIndex(h => h.includes('tandem') || h.includes('partner'));

    if (nameIdx === -1 || classesIdx === -1 || partnersIdx === -1) {
        throw new Error("Could not find required columns: 'Name', 'Race Classes', 'Tandem Boat Partner(s)'.");
    }

    let racerMap = new Map(); // normName -> Set(classes)
    let originalNames = new Map(); // normName -> Display Name
    let classesSet = new Set();
    let parsedRows = [];
    let registeredNames = new Set();
    let registeredNamesLower = new Map(); // lower -> original
    let tandemPartnerChecks = [];

    // Pass 1: Parse Data & build base maps
    for (let i = 1; i < lines.length; i++) {
        let row = lines[i];
        if (!row || row.length <= Math.max(nameIdx, classesIdx, partnersIdx)) continue;

        let name = (row[nameIdx] || "").trim();
        if (!name) continue;

        registeredNames.add(name);
        registeredNamesLower.set(name.toLowerCase(), name);

        let normName = name.toLowerCase();
        if (!racerMap.has(normName)) {
            racerMap.set(normName, new Set());
            originalNames.set(normName, name);
        }

        let classesList = (row[classesIdx] || "").split(',').map(s => s.trim()).filter(s => s);
        let partnersList = (row[partnersIdx] || "").split(',').map(s => s.trim()).filter(s => s);

        let tandemClasses = classesList.filter(cls => cls.includes('2'));
        let partnerMap = {}; // cls -> normPartner

        for (let cls of classesList) {
            classesSet.add(cls);
            racerMap.get(normName).add(cls);
        }

        for (let idx = 0; idx < tandemClasses.length; idx++) {
            let cls = tandemClasses[idx];
            let partnerName = "";
            if (partnersList.length === 1) {
                partnerName = partnersList[0];
            } else if (idx < partnersList.length) {
                partnerName = partnersList[idx];
            }

            if (partnerName) {
                let trimmedPartner = partnerName.trim();
                tandemPartnerChecks.push({
                    partnerName: trimmedPartner,
                    racerName: name
                });

                let normPartner = trimmedPartner.toLowerCase();
                partnerMap[cls] = normPartner;

                // Ensure partner is also known to the system even if they lack their own row
                if (!racerMap.has(normPartner)) {
                    racerMap.set(normPartner, new Set());
                    originalNames.set(normPartner, partnerName);
                }
                racerMap.get(normPartner).add(cls);
            }
        }

        parsedRows.push({ normName, classes: classesList, partnerMap });
    }

    // Process tandem partner mismatches
    let mismatchedPartners = [];
    let seenMismatches = new Set();
    for (let check of tandemPartnerChecks) {
        if (!registeredNames.has(check.partnerName)) {
            let key = `${check.partnerName}||${check.racerName}`;
            if (!seenMismatches.has(key)) {
                seenMismatches.add(key);
                let norm = check.partnerName.toLowerCase();
                let registeredVersion = registeredNamesLower.get(norm);
                mismatchedPartners.push({
                    partnerName: check.partnerName,
                    racerName: check.racerName,
                    registeredVersion: registeredVersion
                });
            }
        }
    }

    let C = Array.from(classesSet);
    if (C.length < 2) {
        throw new Error("Not enough distinct classes found to split into two sessions.");
    }

    // Count boats carefully, merging tandem partners
    let classBoaters = {};
    for (let cls of C) {
        let pairs = [];
        let solos = [];

        for (let row of parsedRows) {
            if (row.classes.includes(cls)) {
                if (cls.includes('2') && row.partnerMap[cls]) {
                    pairs.push([row.normName, row.partnerMap[cls]]);
                } else {
                    solos.push(row.normName);
                }
            }
        }

        let finalBoats = [];
        let pairedRacers = new Set(); // store normName

        for (let [p1, p2] of pairs) {
            if (!pairedRacers.has(p1) && !pairedRacers.has(p2)) {
                pairedRacers.add(p1);
                pairedRacers.add(p2);
                let name1 = originalNames.get(p1) || p1;
                let name2 = originalNames.get(p2) || p2;
                finalBoats.push(`${name1} & ${name2}`);
            }
        }

        for (let solo of solos) {
            if (!pairedRacers.has(solo)) {
                finalBoats.push(originalNames.get(solo) || solo);
            }
        }
        classBoaters[cls] = finalBoats;
    }

    // Extract multi-class racers for overlap logic
    let multiRacers = [];
    for (let [racer, classes] of racerMap.entries()) {
        if (classes.size >= 2) {
            multiRacers.push(Array.from(classes).map(c => C.indexOf(c)));
        }
    }

    // Map string arrays to index arrays for fast computing
    let classBoatArray = C.map(c => classBoaters[c].length);

    // Run the optimizer
    let state;
    let resultEval;
    if (isSingleSession) {
        state = Array(C.length).fill(true);
        const totalBoats = classBoatArray.reduce((a, b) => a + b, 0);
        resultEval = { cost: 0, overlap: 0, diff: totalBoats, boatsA: totalBoats, boatsB: 0, valid: true };
    } else {
        const opt = runSimulatedAnnealing(C.length, multiRacers, classBoatArray, maxDiff, 600);
        state = opt.state;
        resultEval = opt.eval;
    }

    // Reconstruct sets
    let sessionA = [], sessionB = [];
    for (let i = 0; i < C.length; i++) {
        if (state[i]) sessionA.push(C[i]);
        else sessionB.push(C[i]);
    }

    // Find exactly who is overlapping
    let setA_Names = new Set(sessionA);
    let overlappingRacers = [];
    let onlyARacers = [];
    let onlyBRacers = [];

    for (let [normName, classes] of racerMap.entries()) {
        let inA = false, inB = false;
        for (let cls of classes) {
            if (setA_Names.has(cls)) inA = true;
            else inB = true;
        }
        if (inA && inB) {
            overlappingRacers.push(originalNames.get(normName));
        } else if (inA) {
            onlyARacers.push(originalNames.get(normName));
        } else if (inB) {
            onlyBRacers.push(originalNames.get(normName));
        }
    }

    overlappingRacers.sort();
    onlyARacers.sort();
    onlyBRacers.sort();

    return {
        sessionA,
        sessionB,
        overlappingRacers,
        onlyARacers,
        onlyBRacers,
        classBoaters,
        mismatchedPartners,
        resultEval,
        racerMap,
        originalNames
    };
}

// --- 6. Work Assignment Storage Logic (Pure Functions for Unit Testing) ---
export function loadStoredAssignments(stored, raceDate) {
    if (!stored) return null;
    try {
        const allAssignments = JSON.parse(stored);
        if (allAssignments && allAssignments[raceDate]) {
            return allAssignments[raceDate];
        }
    } catch (e) {
        console.error('Failed to parse work assignments', e);
    }
    return null;
}

export function saveStoredAssignments(stored, raceDate, userWorkAssignments) {
    try {
        const allAssignments = stored ? JSON.parse(stored) : {};
        allAssignments[raceDate] = userWorkAssignments;
        return JSON.stringify(allAssignments);
    } catch (e) {
        console.error('Failed to save work assignments', e);
        return stored;
    }
}

export function resetStoredAssignments(stored, raceDate) {
    try {
        if (!stored) return JSON.stringify({});
        const allAssignments = JSON.parse(stored);
        delete allAssignments[raceDate];
        return JSON.stringify(allAssignments);
    } catch (e) {
        console.error('Failed to reset work assignments', e);
        return stored;
    }
}
