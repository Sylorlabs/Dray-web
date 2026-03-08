import Dexie, { Table } from 'dexie';
import type { Project, Track, Clip, MidiNote } from './types';

export type { Project, Track, Clip, MidiNote };

export interface AudioSample {
    id?: number;
    name: string;
    data: ArrayBuffer;
    type: string;
    duration: number;
}

export class DreyDB extends Dexie {
    projects!: Table<Project>;
    tracks!: Table<Track>;
    samples!: Table<AudioSample>;

    constructor() {
        super('DreyDB');
        this.version(1).stores({
            projects: '++id, name, updatedAt',
            tracks: '++id, projectId, type',
            samples: '++id, name'
        });
    }
}

export const db = new DreyDB();
