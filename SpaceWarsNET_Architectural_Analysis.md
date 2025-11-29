# SpaceWarsNET Reference Implementation - Architectural Pattern Analysis

## Overview
This document provides a comprehensive analysis of the SpaceWarsNET reference implementation patterns that must be replicated in the CleosHeartNG TypeScript conversion.

## 1. File Structure and Organization

### 1.1 File Naming and Separation
- **SlotSettings.ts**: Game-specific configuration, reel management, and win calculation logic
- **Server.ts**: HTTP request handling, game flow control, and response formatting
- Both files include conversion comments:
  ```typescript
  // SlotSettings.ts - SpaceWarsNET game specific settings
  // Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines
  ```

### 1.2 Dependencies on Base Classes
- Inherits from `BaseSlotSettings` in parent directory
- Uses `ISlotSettingsData` interface for type safety
- Proper relative path imports (`../../` for base classes)

## 2. Import Patterns and Dependencies

### 2.1 SlotSettings.ts Imports
```typescript
import { BaseSlotSettings } from "../../BaseSlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";
```

### 2.2 Server.ts Imports
```typescript
import { SlotSettings, ReelStrips } from "./SlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";
```

### 2.3 Import Strategy
- Local game imports use relative paths
- Base class imports use `../../` prefix
- Type exports are properly named and scoped

## 3. Class Inheritance and Composition Patterns

### 3.1 SlotSettings Class Structure
```typescript
export class SlotSettings extends BaseSlotSettings {
    public constructor(slotSettingsData: ISlotSettingsData) {
        super(slotSettingsData);
        this.initializeFromGameState(slotSettingsData);
    }
    
    private initializeFromGameState(gameStateData: ISlotSettingsData): void {
        // Game-specific initialization logic
    }
}
```

### 3.2 Server Class Structure
```typescript
export class Server {
    protected slotSettings: SlotSettings;
    private slotId: string = 'SpaceWarsNET';
    
    public constructor(slotSettingsData: ISlotSettingsData) {
        this.slotSettings = new SlotSettings(slotSettingsData);
        this.sessionId = this.generateSessionId();
    }
}
```

### 3.3 Composition vs Inheritance
- **SlotSettings**: Uses inheritance from `BaseSlotSettings`
- **Server**: Uses composition with `SlotSettings`
- Clear separation of configuration vs request handling

## 4. TypeScript Interface Usage and Type Safety

### 4.1 Strongly-Typed Reel Strips
```typescript
export type ReelStrips = {
    rp: number[];
    reel1?: Array<string | number>;
    reel2?: Array<string | number>;
    reel3?: Array<string | number>;
    reel4?: Array<string | number>;
    reel5?: Array<string | number>;
    reel6?: Array<string | number>;
    [key: string]: Array<string | number> | number[] | undefined;
};
```

### 4.2 Data Injection Pattern
- Constructor injection with `ISlotSettingsData`
- No direct database calls or PHP legacy constructs
- All data comes through the constructor parameter

## 5. Game State Initialization Logic

### 5.1 Initialize Pattern
```typescript
private initializeFromGameState(gameStateData: ISlotSettingsData): void {
    // Core game configuration
    this.MaxWin = this.shop?.max_win ?? 50000;
    this.increaseRTP = 1;
    this.CurrentDenom = this.game?.denominations?.[0] ?? 1;
    
    // Paytable configuration
    this.Paytable = {
        'SYM_1': [0, 0, 0, 0, 0, 0],
        'SYM_2': [0, 0, 0, 30, 250, 1000],
        // ... more symbols
    };
    
    // Bet configuration
    this.Bet = this.game?.bet ? 
        this.game.bet.split(',').map(b => parseInt(b.trim())) : 
        [1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 100, 200, 300];
}
```

### 5.2 Configuration Sources
- Game configuration from injected data
- Shop settings (max win, percent, currency)
- User settings (balance, count_balance)
- Fallback defaults for missing data

## 6. RTP and Reel Management Patterns

### 6.1 RTP Control Implementation
```typescript
public GetSpinSettings(garantType: string = 'bet', bet: number, lines: number): [string, number] {
    const currentPercent = this.shop?.percent ?? 10;
    const rtpRange = (this.game?.stat_in ?? 0) > 0 ?
        (this.game?.stat_out ?? 0) / (this.game?.stat_in ?? 1) * 100 : 0;
    
    // Complex RTP control logic with spin win limits
    // ...
}
```

### 6.2 Reel Strip Management
```typescript
private initializeReelStrips(): void {
    const reelStrips = this.gameDataStatic?.reelStrips;
    if (reelStrips) {
        for (const reelStrip of ['reelStrip1', 'reelStrip2', /* ... */]) {
            if (reelStrips[reelStrip] && reelStrips[reelStrip].length > 0) {
                (this as any)[reelStrip] = reelStrips[reelStrip];
            }
        }
    }
}
```

## 7. Server Class Patterns

### 7.1 Request Processing Pattern
```typescript
public get(request: any, game: any): any {
## 11. Differences from PHP Implementation

### 11.1 Type Safety
- **PHP**: Dynamic typing with arrays
- **TypeScript**: Strong typing with interfaces and custom types

### 11.2 Error Handling
- **PHP**: Basic error handling
- **TypeScript**: Structured try-catch with type-safe error responses

### 11.3 Data Management
- **PHP**: Direct database calls and session management
- **TypeScript**: Constructor injection with data objects

### 11.4 Code Organization
- **PHP**: Procedural functions
- **TypeScript**: Class-based with clear separation of concerns

### 11.5 Win Calculation
- **PHP**: Array-based symbol checking
- **TypeScript**: Type-safe win validation with proper wild handling

## 12. Implementation Checklist for CleosHeartNG

### 12.1 SlotSettings Implementation
- [ ] Create SlotSettings class extending BaseSlotSettings
- [ ] Implement game-specific initializeFromGameState method
- [ ] Create ReelStrips interface for type safety
- [ ] Define game-specific paytable configuration
- [ ] Implement RTP control logic similar to GetSpinSettings
- [ ] Add reel strip initialization logic
- [ ] Implement GetRandomScatterPos method
- [ ] Add GetReelStrips method with win type handling
- [ ] Implement getNewSpin method for bonus/spin logic

### 12.2 Server Implementation
- [ ] Create Server class with SlotSettings composition
- [ ] Implement action routing with switch statement
- [ ] Create handleInitRequest method with game state restoration
- [ ] Implement handleSpinRequest with win calculation
- [ ] Create handlePaytableRequest method
- [ ] Add response formatting methods
- [ ] Implement 2000-iteration win validation loop
- [ ] Add JSON logging functionality
- [ ] Maintain legacy query string response format

### 12.3 Critical Technical Requirements
- [ ] Use constructor injection with ISlotSettingsData
- [ ] Add proper TypeScript error handling
- [ ] Ensure all data comes through constructor parameters
- [ ] Implement proper wild symbol handling
- [ ] Add balance tracking with denomination support
- [ ] Implement free spins logic if applicable
- [ ] Add scatter symbol handling
- [ ] Ensure line-based win validation
- [ ] Add bank and percentage management
- [ ] Implement max win validation

### 12.4 Data Flow Requirements
- [ ] Follow exact data flow pattern from SpaceWarsNET
- [ ] Maintain compatibility with existing BaseSlotSettings
- [ ] Preserve RTP control mechanisms
- [ ] Ensure proper reel position handling
- [ ] Implement proper win limit validation
- [ ] Add spin limit counters for RTP management
- [ ] Implement balance transaction logging

## 13. Key Patterns for CleosHeartNG Conversion

### 13.1 Essential Patterns to Replicate
1. **Constructor Pattern**: All data injected through constructor parameters
2. **Initialization Pattern**: Private initializeFromGameState method
3. **RTP Control Pattern**: Complex GetSpinSettings with win limit management
4. **Reel Management Pattern**: Dynamic reel strip initialization
5. **Win Validation Pattern**: 2000-iteration simulation loop
6. **Error Handling Pattern**: Try-catch with structured responses
7. **Response Pattern**: Legacy query string with comprehensive state data
8. **Logging Pattern**: JSON log reports for debugging

### 13.2 Game-Specific Adaptations Needed
- **Symbol Configuration**: Adapt paytable to CleosHeartNG symbols
- **Reel Configuration**: Modify reel strip data source
- **Lines Configuration**: Adjust line patterns for game rules
- **Bet Configuration**: Update bet levels and denominations
- **Bonus Logic**: Implement CleosHeartNG-specific bonus features
- **Wild Configuration**: Define wild symbol behavior
- **Scatter Configuration**: Set scatter symbol rules

### 13.3 Critical Implementation Areas
1. **Win Calculation Logic**: Must maintain exact simulation loop structure
2. **RTP Management**: Complex percentage control with spin limits
3. **State Management**: Game-specific state restoration on init
4. **Response Formatting**: Legacy query string compatibility
5. **Error Recovery**: Proper error handling with state validation
6. **Balance Management**: Denomination-aware balance tracking
7. **Bank Integration**: Percentage-based bank calculations

## 14. Quality Assurance Checklist

### 14.1 Code Quality
- [ ] All TypeScript compilation passes without errors
- [ ] Proper interface implementations
- [ ] Type safety throughout codebase
- [ ] Consistent coding patterns with reference
- [ ] Proper error handling coverage
- [ ] Clean separation of concerns

### 14.2 Functional Testing
- [ ] Initialization logic works correctly
- [ ] Spin requests process through full win calculation
- [ ] RTP control manages bank percentages properly
- [ ] Balance tracking maintains accuracy
- [ ] Bonus/free spins function as expected
- [ ] Error states handle gracefully
- [ ] Response formatting matches legacy format

### 14.3 Integration Testing
- [ ] BaseSlotSettings integration works properly
- [ ] ISlotSettingsData interface is fully implemented
- [ ] Constructor injection pattern is consistent
- [ ] Game state persistence functions correctly
- [ ] Logging system captures proper data
- [ ] Error reporting includes relevant information

## 15. Conclusion

The SpaceWarsNET reference implementation demonstrates a robust TypeScript conversion pattern that successfully bridges legacy PHP game logic with modern, type-safe TypeScript architecture. The key to successful CleosHeartNG conversion lies in:

1. **Following exact architectural patterns** from the reference implementation
2. **Maintaining the complex RTP control logic** that manages game profitability
3. **Preserving the 2000-iteration win validation loop** for proper game balance
4. **Implementing proper type safety** while maintaining legacy compatibility
5. **Using constructor injection** for all data dependencies

The reference implementation shows how to convert complex slot game logic from PHP to TypeScript while maintaining the intricate business rules that govern game behavior, RTP management, and win validation. By following these patterns exactly, the CleosHeartNG conversion will maintain the same game behavior and technical robustness as the reference implementation.
    try {
        const response = this.processRequest(request, game);
        return response;
    } catch (error) {
        return this.handleError(error);
    }
}
```

### 7.2 Action Mapping and Event Handling
```typescript
private processRequest(request: any, game: any): string {
    // Map actions to slot events
    postData.slotEvent = 'bet';
    if (postData.action === 'respin') {
        postData.slotEvent = 'freespin';
        postData.action = 'spin';
    }
    if (postData.action === 'init' || postData.action === 'reloadbalance') {
        postData.action = 'init';
        postData.slotEvent = 'init';
    }
    
    // Route to appropriate handler
    switch (aid) {
        case 'init':
            return this.handleInitRequest();
        case 'paytable':
            return this.handlePaytableRequest();
        case 'spin':
            return this.handleSpinRequest(postData);
    }
}
```

## 8. Response Formatting Patterns

### 8.1 Massive Query String Response
```typescript
// Construct the massive query string response
let result = `bl.i32.reelset=ALL&bl.i6.coins=1&bl.i17.reelset=ALL&...${curReels}`;
```

### 8.2 JSON Logging Pattern
```typescript
const logResponse = {
    responseEvent: 'spin',
    responseType: postData.slotEvent,
    serverResponse: {
        slotLines: lines,
        slotBet: betline,
        totalFreeGames: /* ... */,
        // ... comprehensive response data
    }
};
this.slotSettings.SaveLogReport(JSON.stringify(logResponse), allbet, lines, reportWin, postData.slotEvent);
```

## 9. Win Calculation Implementation Patterns

### 9.1 Simulation Loop Pattern
```typescript
// Simulation loop
for (let i = 0; i <= 2000; i++) {
    totalWin = 0;
    lineWins = [];
    
    // Win checking for each line
    for (let k = 0; k < lines; k++) {
        // Symbol matching logic
        for (let j = 0; j < this.slotSettings.SymbolGame.length; j++) {
            // Check for 3, 4, 5 symbol matches
            const matchCounts = [3, 4, 5];
            for (const count of matchCounts) {
                // Wild symbol handling
                // Win amount calculation
            }
        }
    }
    
    // RTP validation checks
    // Bank limit validation
    // Break conditions
}
```

### 9.2 Wild Symbol Handling
```typescript
if (wildCount > 0 && wildCount < count) {
    mpl = this.slotSettings.slotWildMpl;
} else if (wildCount === count) {
    mpl = 1; // All wilds
}
```

## 10. Key Architectural Requirements for CleosHeartNG

### 10.1 Must Follow Patterns
1. **Inheritance**: SlotSettings extends BaseSlotSettings
2. **Composition**: Server contains SlotSettings instance
3. **Constructor Injection**: All data through constructor parameters
4. **Type Safety**: Use TypeScript interfaces and types
5. **Error Handling**: Try-catch with structured error responses
6. **RTP Control**: Implement complex RTP management logic
7. **Response Format**: Maintain legacy query string format
8. **Simulation Logic**: 2000-iteration win validation loops

### 10.2 Critical Implementation Details
1. **Reel Management**: Strongly-typed ReelStrips interface
2. **State Management**: Game-specific initialization method
3. **Balance Tracking**: Integration with slotSettings balance methods
4. **Win Calculation**: Line-based validation with wild handling
5. **Action Routing**: Switch-based request handling
6. **Logging**: JSON log reporting for debugging

### 10.3 Data Flow Pattern
```
Client Request → Server.get() → processRequest() → action handler → 
SlotSettings methods → Win calculation → Response formatting → 
JSON logging → Legacy query string response