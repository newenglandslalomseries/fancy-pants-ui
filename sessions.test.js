import { describe, it, expect, vi } from 'vitest';
import { parseTSV, parseMissingBibs, assignWork, noWorkList, optimizeSessions, loadStoredAssignments, saveStoredAssignments, resetStoredAssignments } from './sessions.js';


describe('sessions.js unit tests', () => {
    describe('parseTSV', () => {
        it('should parse a basic TSV string into rows and columns', () => {
            const tsv = "Name\tClass\tPartner\nJohn Doe\tK1\t\nJane Smith\tC2\tBob Jones";
            const parsed = parseTSV(tsv);
            expect(parsed).toEqual([
                ["Name", "Class", "Partner"],
                ["John Doe", "K1", ""],
                ["Jane Smith", "C2", "Bob Jones"]
            ]);
        });
    });

    describe('parseMissingBibs', () => {
        it('should parse single numbers and ranges', () => {
            const missing = parseMissingBibs("5, 12, 15-18");
            expect(Array.from(missing).sort((a, b) => a - b)).toEqual([5, 12, 15, 16, 17, 18]);
        });

        it('should handle empty input', () => {
            const missing = parseMissingBibs("");
            expect(missing.size).toBe(0);
        });
    });

    describe('assignWork', () => {
        it('should assign work for single session mode with Finish prioritized up to three', () => {
            const racers = ["Racer 1", "Racer 2", "Racer 3", "Racer 4", "Racer 5", "Racer 6"];
            const result = assignWork(racers, true, []);
            expect(result).toEqual([
                { name: "Racer 1", assignment: "Finish" },
                { name: "Racer 2", assignment: "Finish" },
                { name: "Racer 3", assignment: "Finish" },
                { name: "Racer 4", assignment: "Station A" },
                { name: "Racer 5", assignment: "Station B" },
                { name: "Racer 6", assignment: "Station C" }
            ]);
        });

        it('should assign work for double session mode', () => {
            const racers = ["Racer 1", "Racer 2", "Racer 3", "Racer 4", "Racer 5"];
            const result = assignWork(racers, false);
            expect(result).toEqual([
                { name: "Racer 1", assignment: "Finish" },
                { name: "Racer 2", assignment: "Finish" },
                { name: "Racer 3", assignment: "Finish" },
                { name: "Racer 4", assignment: "Station A" },
                { name: "Racer 5", assignment: "Station B" }
            ]);
        });
    });

    describe('noWorkList', () => {
        it('should include Amy Hunt and Sonny Hunt', () => {
            expect(noWorkList).toContain("Amy Hunt");
            expect(noWorkList).toContain("Sonny Hunt");
        });

        it('should be an ordered array of strings', () => {
            expect(Array.isArray(noWorkList)).toBe(true);
            expect(noWorkList.every(n => typeof n === 'string')).toBe(true);
        });
    });

    describe('assignWork with noWork list', () => {
        it('should exclude no-work racers when enough workers exist to fill all stations (double session)', () => {
            // 15 workers fills all 5 stations × 3 slots; Amy and Sonny should get "" assignments.
            const workers = Array.from({ length: 15 }, (_, i) => `Worker ${i + 1}`);
            const racers = [...workers, "Amy Hunt", "Sonny Hunt"];
            const result = assignWork(racers, false, ["Amy Hunt", "Sonny Hunt"]);

            const amyResult = result.find(r => r.name === "Amy Hunt");
            const sonnyResult = result.find(r => r.name === "Sonny Hunt");
            expect(amyResult.assignment).toBe("");
            expect(sonnyResult.assignment).toBe("");

            // All 15 workers should have a real assignment.
            const workerResults = result.filter(r => r.name.startsWith("Worker"));
            expect(workerResults.every(r => r.assignment !== "")).toBe(true);
        });

        it('should include Amy Hunt before Sonny Hunt when workers are insufficient (double session)', () => {
            // Only 14 workers — one slot short; Amy (index 0 in list) should be pulled in.
            const workers = Array.from({ length: 14 }, (_, i) => `Worker ${i + 1}`);
            const racers = [...workers, "Amy Hunt", "Sonny Hunt"];
            const result = assignWork(racers, false, ["Amy Hunt", "Sonny Hunt"]);

            const amyResult = result.find(r => r.name === "Amy Hunt");
            const sonnyResult = result.find(r => r.name === "Sonny Hunt");
            expect(amyResult.assignment).not.toBe("");
            expect(sonnyResult.assignment).toBe("");
        });

        it('should include both Amy and Sonny when significantly short on workers (double session)', () => {
            const racers = ["Worker 1", "Worker 2", "Amy Hunt", "Sonny Hunt"];
            const result = assignWork(racers, false, ["Amy Hunt", "Sonny Hunt"]);

            const amyResult = result.find(r => r.name === "Amy Hunt");
            const sonnyResult = result.find(r => r.name === "Sonny Hunt");
            expect(amyResult.assignment).not.toBe("");
            expect(sonnyResult.assignment).not.toBe("");
        });

        it('should behave identically to original when noWork is not provided', () => {
            const racers = ["Racer 1", "Racer 2", "Racer 3", "Racer 4", "Racer 5"];
            const result = assignWork(racers, false);
            expect(result).toEqual([
                { name: "Racer 1", assignment: "Finish" },
                { name: "Racer 2", assignment: "Finish" },
                { name: "Racer 3", assignment: "Finish" },
                { name: "Racer 4", assignment: "Station A" },
                { name: "Racer 5", assignment: "Station B" }
            ]);
        });

        it('should exclude no-work racers in single session mode when enough workers exist (31 racers)', () => {
            // 31 racers: 29 workers + Amy + Sonny. 29 >= 15, so no-work people get "".
            const workers = Array.from({ length: 29 }, (_, i) => `Worker ${i + 1}`);
            const racers = [...workers, "Amy Hunt", "Sonny Hunt"];
            const result = assignWork(racers, true, ["Amy Hunt", "Sonny Hunt"]);

            const amyResult = result.find(r => r.name === "Amy Hunt");
            const sonnyResult = result.find(r => r.name === "Sonny Hunt");
            expect(amyResult.assignment).toBe("");
            expect(sonnyResult.assignment).toBe("");

            // Each of the 5 stations should have exactly 3 workers assigned.
            const stationCounts = {};
            result.filter(r => r.assignment !== "").forEach(r => {
                stationCounts[r.assignment] = (stationCounts[r.assignment] || 0) + 1;
            });
            expect(Object.values(stationCounts).every(c => c === 3)).toBe(true);
        });

        it('should include no-work racers in single session mode when workers are insufficient', () => {
            // Only 14 workers — one slot short of 15; Amy (index 0) should be pulled in.
            const workers = Array.from({ length: 14 }, (_, i) => `Worker ${i + 1}`);
            const racers = [...workers, "Amy Hunt", "Sonny Hunt"];
            const result = assignWork(racers, true, ["Amy Hunt", "Sonny Hunt"]);

            const amyResult = result.find(r => r.name === "Amy Hunt");
            const sonnyResult = result.find(r => r.name === "Sonny Hunt");
            expect(amyResult.assignment).not.toBe("");
            expect(sonnyResult.assignment).toBe("");
        });

        it('should never assign a no-work racer to work during the session they are racing in, even in a shortage', () => {
            // Scenario:
            // Session A classes: ClassA
            // Session B classes: ClassB
            // Amy Hunt races ONLY in ClassA (Session A).
            // Sonny Hunt races ONLY in ClassB (Session B).
            // Worker 1 races ONLY in ClassA.
            // Worker 2 races ONLY in ClassB.
            // Both sessions have severe shortages (< 15 workers).
            const csvText = 
`Name\tRace Classes\tTandem Boat Partner(s)
Amy Hunt\tClassA\t
Sonny Hunt\tClassB\t
Worker 1\tClassA\t
Worker 2\tClassB\t
Overlap Racer\tClassA, ClassB\t`;

            const opt = optimizeSessions({ csvText, maxDiff: 1, isSingleSession: false });
            
            // Amy is racing in Session A (onlyARacers)
            expect(opt.onlyARacers).toContain("Amy Hunt");
            expect(opt.onlyBRacers).not.toContain("Amy Hunt");

            // Sonny is racing in Session B (onlyBRacers)
            expect(opt.onlyBRacers).toContain("Sonny Hunt");
            expect(opt.onlyARacers).not.toContain("Sonny Hunt");

            // Overlap racer is in both
            expect(opt.overlappingRacers).toContain("Overlap Racer");

            // Work for Session B is staffed by onlyARacers (who are free in B)
            const sessionBWorkers = assignWork(opt.onlyARacers, false, ["Amy Hunt", "Sonny Hunt"]);
            // Work for Session A is staffed by onlyBRacers (who are free in A)
            const sessionAWorkers = assignWork(opt.onlyBRacers, false, ["Amy Hunt", "Sonny Hunt"]);

            // 1. In Session A's workforce (staffed during Session A):
            // Amy Hunt CANNOT be assigned because she is racing in Session A.
            const amyInSessionA = sessionAWorkers.find(r => r.name === "Amy Hunt");
            expect(amyInSessionA).toBeUndefined();

            // Sonny Hunt is free during Session A, so he CAN be pulled in if needed.
            const sonnyInSessionA = sessionAWorkers.find(r => r.name === "Sonny Hunt");
            expect(sonnyInSessionA).toBeDefined();

            // 2. In Session B's workforce (staffed during Session B):
            // Sonny Hunt CANNOT be assigned because he is racing in Session B.
            const sonnyInSessionB = sessionBWorkers.find(r => r.name === "Sonny Hunt");
            expect(sonnyInSessionB).toBeUndefined();

            // Amy Hunt is free during Session B, so she CAN be pulled in if needed.
            const amyInSessionB = sessionBWorkers.find(r => r.name === "Amy Hunt");
            expect(amyInSessionB).toBeDefined();

            // 3. Overlapping racers racing in both sessions are never assigned in either session
            expect(sessionAWorkers.find(r => r.name === "Overlap Racer")).toBeUndefined();
            expect(sessionBWorkers.find(r => r.name === "Overlap Racer")).toBeUndefined();
        });
    });

    describe('optimizeSessions', () => {
        it('should optimize sessions and find overlaps', () => {
            const csvText = 
`Name\tRace Classes\tTandem Boat Partner(s)
Alice\tK1, C1\t
Bob\tK1\t
Charlie\tC1\t
Dave\tK1\t`;

            const result = optimizeSessions({ csvText, maxDiff: 1, isSingleSession: false });
            
            // Alice is registered in both K1 and C1, so K1 and C1 must be in different sessions,
            // which makes Alice an overlapping racer.
            expect(result.overlappingRacers).toContain("Alice");
            expect(result.sessionA.length).toBe(1);
            expect(result.sessionB.length).toBe(1);
        });

        it('should correctly pair two racers in multiple separate tandem classes', () => {
            const csvText = 
`Name\tRace Classes\tTandem Boat Partner(s)
Alice\tC2 Mix, K2 Mix\tBob, Bob
Bob\tC2 Mix, K2 Mix\tAlice, Alice`;

            const result = optimizeSessions({ csvText, maxDiff: 1, isSingleSession: false });

            // Ensure Alice and Bob are paired together in both classes
            expect(result.classBoaters['C2 Mix']).toEqual(['Alice & Bob']);
            expect(result.classBoaters['K2 Mix']).toEqual(['Alice & Bob']);
        });

        it('should correctly pair two racers in multiple separate tandem classes when only a single partner is specified', () => {
            const csvText = 
`Name\tRace Classes\tTandem Boat Partner(s)
Alice\tC2 Mix, K2 Mix\tBob
Bob\tC2 Mix, K2 Mix\tAlice`;

            const result = optimizeSessions({ csvText, maxDiff: 1, isSingleSession: false });

            // Ensure Alice and Bob are paired together in both classes
            expect(result.classBoaters['C2 Mix']).toEqual(['Alice & Bob']);
            expect(result.classBoaters['K2 Mix']).toEqual(['Alice & Bob']);
        });

        it('should throw an error if required headers are missing', () => {
            const csvText = `Name\tRace Classes\nAlice\tK1`;
            expect(() => optimizeSessions({ csvText })).toThrow("Could not find required columns");
        });

        it('should throw an error if there are less than 2 distinct classes', () => {
            const csvText = `Name\tRace Classes\tTandem Boat Partner(s)\nAlice\tK1\t\nBob\tK1\t`;
            expect(() => optimizeSessions({ csvText, isSingleSession: false })).toThrow(
                "Not enough distinct classes found to split into two sessions."
            );
        });

        it('should detect mismatched tandem partners', () => {
            const csvText = 
`Name\tRace Classes\tTandem Boat Partner(s)
Alice\tC2 Mix, K1\tBob, 
Bob\tC2 Mix, K1\tCharlie, `; // Bob is registered with Charlie, but Alice registered with Bob

            const result = optimizeSessions({ csvText, isSingleSession: true });
            
            // Charlie is not registered in the Name column
            expect(result.mismatchedPartners).toContainEqual({
                partnerName: "Charlie",
                racerName: "Bob",
                registeredVersion: undefined
            });
        });

        it('should put all classes in Session A in single session mode', () => {
            const csvText = 
`Name\tRace Classes\tTandem Boat Partner(s)
Alice\tK1\t
Bob\tC1\t`;

            const result = optimizeSessions({ csvText, isSingleSession: true });
            expect(result.sessionA).toContain("K1");
            expect(result.sessionA).toContain("C1");
            expect(result.sessionB).toEqual([]);
        });
    });

    describe('Work Assignment Storage Logic', () => {
        describe('loadStoredAssignments', () => {
            it('should return null if stored is empty or falsy', () => {
                expect(loadStoredAssignments(null, '2026-07-01')).toBeNull();
                expect(loadStoredAssignments('', '2026-07-01')).toBeNull();
            });

            it('should return the assignments for the specified race date', () => {
                const stored = JSON.stringify({
                    '2026-07-01': [{ name: 'Alice', assignment: 'Finish' }],
                    '2026-07-02': [{ name: 'Bob', assignment: 'Station A' }]
                });
                expect(loadStoredAssignments(stored, '2026-07-01')).toEqual([
                    { name: 'Alice', assignment: 'Finish' }
                ]);
            });

            it('should return null if the race date is not found', () => {
                const stored = JSON.stringify({
                    '2026-07-01': [{ name: 'Alice', assignment: 'Finish' }]
                });
                expect(loadStoredAssignments(stored, '2026-07-02')).toBeNull();
            });

            it('should return null and log an error if the stored string is invalid JSON', () => {
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                expect(loadStoredAssignments('{invalid json}', '2026-07-01')).toBeNull();
                expect(consoleSpy).toHaveBeenCalled();
                consoleSpy.mockRestore();
            });
        });

        describe('saveStoredAssignments', () => {
            it('should create a new object string if stored is empty/falsy', () => {
                const assignments = [{ name: 'Alice', assignment: 'Finish' }];
                const result = saveStoredAssignments('', '2026-07-01', assignments);
                expect(JSON.parse(result)).toEqual({
                    '2026-07-01': assignments
                });
            });

            it('should update an existing stored object string with the new assignments', () => {
                const initialStored = JSON.stringify({
                    '2026-07-01': [{ name: 'Bob', assignment: 'Station A' }]
                });
                const assignments = [{ name: 'Alice', assignment: 'Finish' }];
                const result = saveStoredAssignments(initialStored, '2026-07-02', assignments);
                expect(JSON.parse(result)).toEqual({
                    '2026-07-01': [{ name: 'Bob', assignment: 'Station A' }],
                    '2026-07-02': assignments
                });
            });

            it('should return original stored string and log an error if JSON parsing fails', () => {
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                const result = saveStoredAssignments('{invalid json}', '2026-07-01', []);
                expect(result).toBe('{invalid json}');
                expect(consoleSpy).toHaveBeenCalled();
                consoleSpy.mockRestore();
            });
        });

        describe('resetStoredAssignments', () => {
            it('should return empty object string if stored is empty or falsy', () => {
                expect(resetStoredAssignments(null, '2026-07-01')).toBe(JSON.stringify({}));
                expect(resetStoredAssignments('', '2026-07-01')).toBe(JSON.stringify({}));
            });

            it('should remove the entry for the specified race date', () => {
                const stored = JSON.stringify({
                    '2026-07-01': [{ name: 'Alice', assignment: 'Finish' }],
                    '2026-07-02': [{ name: 'Bob', assignment: 'Station A' }]
                });
                const result = resetStoredAssignments(stored, '2026-07-01');
                expect(JSON.parse(result)).toEqual({
                    '2026-07-02': [{ name: 'Bob', assignment: 'Station A' }]
                });
            });

            it('should return the original stored string and log an error if JSON parsing fails', () => {
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                const result = resetStoredAssignments('{invalid json}', '2026-07-01');
                expect(result).toBe('{invalid json}');
                expect(consoleSpy).toHaveBeenCalled();
                consoleSpy.mockRestore();
            });
        });
    });
});
