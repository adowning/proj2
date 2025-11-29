// ISlotSettingsData.ts - Interface for SlotSettings data injection
// Following CONVERT_TO_TYPESCRIPT.md guidelines exactly

import { User } from './proj/Models/User';
import { Game } from './proj/Models/Game';
import { Shop } from './proj/Models/Shop';
import { JPG } from './proj/Models/JPG';

export interface ISlotSettingsData {
    // Must include User, Game, Shop with explicit types
    user: User;
    game: Game;
    shop: Shop;
    
    // Additional properties needed by BaseSlotSettings
    balance: number;
    currency: string;
    slotId?: string;
    playerId?: number;
    count_balance?: number;
    
    // Game data properties
    gameData?: { [key: string]: any };
    gameDataStatic?: { [key: string]: any };
    
    // Bank and jackpot properties
    bank?: number;
    jackpots?: { [key: string]: any };
    
    // Reel strips data
    reelStrips?: { [key: string]: any[] };
    
    // JPG data
    jpgs?: JPG[];
    
    // Banker service and bet logs
    bankerService?: any;
    betLogs?: any;
    
    // Game state
    state?: any;
    
    // Other settings
    increaseRTP?: number;
}