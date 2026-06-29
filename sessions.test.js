import { describe, it, expect } from 'vitest';
import { parseTSV, parseMissingBibs, assignWork, optimizeSessions } from './sessions.js';

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
    });
});
