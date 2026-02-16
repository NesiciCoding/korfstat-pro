import { Gender, Position } from './index';

export interface ClubPlayer {
    id: string; // UUID
    firstName: string;
    lastName: string;
    gender: Gender;
    dateOfBirth?: string; // ISO Date string YYYY-MM-DD
    photoUrl?: string; // Optional URL to stored image
    active: boolean; // Soft delete
    shirtNumber?: number; // Preferred shirt number
    positions?: Position[]; // Preferred positions
}

export interface Club {
    id: string; // UUID
    name: string;
    shortName: string; // e.g. "PKC"
    primaryColor: string; // Hex
    secondaryColor?: string; // Hex
    logoUrl?: string; // Optional URL
    players: ClubPlayer[];
    createdAt: number;
    updatedAt: number;
}
