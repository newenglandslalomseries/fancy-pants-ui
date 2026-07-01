import { describe, it, expect, vi } from 'vitest';
import { parseTSV, parseMissingBibs, assignWork, optimizeSessions, loadStoredAssignments, saveStoredAssignments, resetStoredAssignments } from './sessions.js';


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
        it('should assign work for single session mode', () => {
            const racers = ["Racer 1", "Racer 2", "Racer 3", "Racer 4", "Racer 5", "Racer 6"];
            const result = assignWork(racers, true);
            expect(result).toEqual([
                { name: "Racer 1", assignment: "Finish" },
                { name: "Racer 2", assignment: "Finish" },
                { name: "Racer 3", assignment: "Station A" },
                { name: "Racer 4", assignment: "Station B" },
                { name: "Racer 5", assignment: "Station C" },
                { name: "Racer 6", assignment: "Station D" }
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
