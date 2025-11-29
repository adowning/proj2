Instructions for PHP to TypeScript Game Conversion
These instructions guide the conversion of a single game's core logic (SlotSettings and Server) from PHP to TypeScript. The process relies on a data injection pattern to eliminate database/legacy calls and mandates strict preservation of all original game calculations.

1. Data Contract Definition (Strong Typing)
   You must define the exact structure of the configuration object (slotSettingsData) that the new TypeScript classes will consume.

Import Models: Ensure the following classes/interfaces are available (they should be imported from proj/Games/proj/Models/).

User (from proj/Games/proj/Models/User.ts)

Game (from proj/Games/proj/Models/Game.ts)

Shop (from proj/Games/proj/Models/Shop.ts)

Define Interface: Create the ISlotSettingsData interface in a common location (e.g., proj/Games/ISlotSettingsData.ts). Do not use any for core models.

TypeScript

// Example: proj/Games/ISlotSettingsData.ts
// Adjust relative paths based on where this interface file is placed
import { User } from './proj/Models/User';
import { Game } from './proj/Models/Game';
import { Shop } from './proj/Models/Shop';

export interface ISlotSettingsData {
// Must include User, Game, Shop with explicit types
user: User;
game: Game;
shop: Shop;
// Include any other top-level properties needed by BaseSlotSettings
balance: number;
currency: string;
// ... all other required data
} 2. Prepare and Clean SlotSettings.php
Target PHP File: proj/Games/<GameName>/SlotSettings.php.

Cleanup: Delete all methods from this PHP file that are already defined in the existing proj/Games/BaseSlotSettings.ts. This limits the file's scope to only game-specific logic.

3. Convert SlotSettings to TypeScript (SlotSettings.ts)
   Create Target File: proj/Games/<GameName>/SlotSettings.ts.

Imports: Import BaseSlotSettings and the ISlotSettingsData interface.

Implement Strongly-Typed Constructor: The constructor must accept and use the strictly-typed object.

TypeScript

// Structure for proj/Games/<GameName>/SlotSettings.ts

import { BaseSlotSettings } from "../../BaseSlotSettings"; // Adjust path
import { ISlotSettingsData } from "../ISlotSettingsData"; // Adjust path
import { User } from "../proj/Models/User"; // Import models for property typing
import { Game } from "../proj/Models/Game";
import { Shop } from "../proj/Models/Shop";

export class SlotSettings extends BaseSlotSettings {

    // Define properties using the imported types
    public user: User;
    public game: Game;
    public shop: Shop;
    // ... all other properties must be strongly typed

    // The constructor must use the strongly-typed data object
    public constructor(slotSettingsData: ISlotSettingsData) {
        // Pass data to BaseSlotSettings
        super(slotSettingsData);
        this.initializeFromGameState(slotSettingsData);
    }

    private initializeFromGameState(gameStateData: ISlotSettingsData): void {
        // When initializing properties, use the typed nested objects
        this.user = gameStateData.user;
        this.game = gameStateData.game;
        this.shop = gameStateData.shop;
        // ... rest of the initialization logic using gameStateData properties
    }

    // ... convert remaining properties and methods from SlotSettings.php

}
Logic Preservation Rule: Translate all remaining code. All calculations, logic, and algorithmic behavior must be preserved exactly as in the original PHP file without any refactoring or modification.

4. Convert Server to TypeScript (Server.ts)
   Target PHP File: proj/Games/<GameName>/Server.php.

Create Target File: proj/Games/<GameName>/Server.ts.

Implement Strongly-Typed Constructor (Primary Injection Point):

TypeScript

// Structure for proj/Games/<GameName>/Server.ts

import { SlotSettings } from "./SlotSettings";
import { ISlotSettingsData } from "../ISlotSettingsData"; // Adjust path

export class Server {
protected slotSettings: SlotSettings;

    // The Server constructor uses the strongly-typed data object
    public constructor(slotSettingsData: ISlotSettingsData) {
        // Instantiate SlotSettings by passing the received data object
        this.slotSettings = new SlotSettings(slotSettingsData);
        // ... rest of the Server constructor logic
    }

    // ... convert remaining methods

}
Database/Legacy Class Elimination (CRITICAL):

Remove ALL PHP code that queries a database or calls unprovided legacy/Laravel classes (e.g., DB::, new Model()).

Data Source: The replacement logic for these operations must exclusively read data from the properties available on the injected slotSettingsData object.

Logic Preservation: Ensure all game flow logic in Server.ts is converted exactly, preserving all original calculations and behavior.
