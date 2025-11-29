// BaseSlotSettings.ts (TypeScript Version) - Converted from PHP
// Preserving original structure and functionality to maintain compatibility with legacy clients

// Define interfaces for models (based on usage in the original code)



// Mock Log class (in PHP it was Games\Log, in TS use console or a logger)
class Log {
    static info(message: string): void {
        console.log(message);
    }
}

// Import the new GameReel class
import { GameReel } from './ts/GameReel';
import { User } from './ts/Models/User';
import { Game } from './ts/Models/Game';
import { Shop } from './ts/Models/Shop';
import { JPG } from './ts/Models/JPG';

// Main class
export class BaseSlotSettings {
    // Public properties with types
    public splitScreen: any = null;
    public reelStrip1: any[] | null = null;
    public reelStrip2: any[] | null = null;
    public reelStrip3: any[] | null = null;
    public reelStrip4: any[] | null = null;
    public reelStrip5: any[] | null = null;
    public reelStrip6: any[] | null = null;
    public reelStripBonus1: any[] | null = null;
    public reelStripBonus2: any[] | null = null;
    public reelStripBonus3: any[] | null = null;
    public reelStripBonus4: any[] | null = null;
    public reelStripBonus5: any[] | null = null;
    public reelStripBonus6: any[] | null = null;
    public slotDBId: string = '';
    public Line: any = null;
    public scaleMode: any = null;
    public numFloat: number | null = null;
    public gameLine: any = null;
    public Bet: any = null;
    public SymbolGame: any[] = [];
    public GambleType: any = null;
    public lastEvent: any = null;
    public keyController: { [key: string]: string } | null = null;
    public slotViewState: any = null;
    public hideButtons: any = null;
    public slotReelsConfig: any = null;
    public slotFreeCount: number[] | number = [];
    public slotExitUrl: any = null;
    public slotBonusType: any = null;
    public slotScatterType: any = null;
    public slotGamble: any = null;
    public slotSounds: any[] = [];
    public jpgs: JPG[] = [];
    public betLogs: any = null;
    public increaseRTP: number | null = null;

    protected betRemains: number | null = null;
    protected betRemains0: number | null = null;
    public toGameBanks: number | null = null;
    public toSlotJackBanks: number | null = null;
    public toSysJackBanks: number | null = null;
    public betProfit: number | null = null;
    public slotJackPercent: any[] = [];
    public slotJackpot: any[] = [];

    // Dependencies
    protected bankerService: any;
    protected userStatusEnum: string = 'BANNED';

    public logReport: any[] = [];
    public errorLogReport: any[] = [];
    public internalError: any[] = [];
    public gameData: { [key: string]: any } = {};
    public gameDataStatic: { [key: string]: any } = {};
    public AllBet: number = 0;
    public MaxWin: number = 0;
    public CurrentDenom: number = 1;
    public GameData: any[] = [];
    public Denominations: number[] = [];
    public CurrentDenomination: number = 1.0;
    public slotCurrency: string = 'USD';
    public playerId: number | null = null;
    public Balance: number | null = null;
    public Jackpots: { [key: string]: any } = {};
    // Paytable maps symbol keys like 'SYM_0' to arrays of payouts for counts 0..n
    public Paytable: { [key: string]: number[] } = {};
    public slotId: string = '';
    public Bank: number | null = null;
    public Percent: number | null = null;
    public WinLine: any = null;
    public WinGamble: number | null = null;
    public Bonus: any = null;
    public shop_id: number | null = null;
    public currency: string | null = null;
    public user: User;
    public game: Game;
    public shop: Shop;
    public jpgPercentZero: boolean = false;
    public count_balance: number | null = null;

    // Game State Properties
    public slotBonus: any = null;
    public isBonusStart: boolean | null = null;
    public slotFreeMpl: number = 1;
    public slotWildMpl: number = 1;

    public goldsvetData: any = {};

    // Configuration Defaults
    public reelRows: number = 3;
    public scatterSymbolId: string = '0';

    // Reel Strip Placeholders
    public reelStripsData: any[] = [];

    // Constructor
    public slotFastStop: any;
    public constructor(settings: { [key: string]: any }) {
        // 1. Unpack settings - convert arrays to Model objects using ModelFactory
        this.user = new User(settings['user'])
        this.game = new Game(settings['game'])
        this.shop = new Shop(settings['shop'])
        const jpgs: any[] = settings['jpgs']
        jpgs.forEach(jpg => {
            this.jpgs.push(new JPG(jpg))
        })
        // this.user = this.convertToModel(settings['user'] ?? null, 'user');
        // this.game = this.convertToModel(settings['game'] ?? null, 'game');
        // this.shop = this.convertToModel(settings['shop'] ?? null, 'shop');

        this.initializeGameDataSafely();

        // Convert JPGs array to JPG models if needed
        const jpgsData = settings['jpgs'] ?? [];
        if (jpgsData && Array.isArray(jpgsData)) {
            this.jpgs = [];
            for (const jpgData of jpgsData) {
                // Only create new JPG objects if we have array data
                // If it's already a JPG object, use it directly
                if (jpgData instanceof Object) { // Simplified check
                    this.jpgs.push(jpgData as JPG);
                } else if (Array.isArray(jpgData)) {
                    this.jpgs.push(jpgData as any); // Fallback
                } else {
                    this.jpgs.push(jpgData as JPG);
                }
            }
        } else {
            this.jpgs = jpgsData;
        }

        this.gameData = settings['gameData'] ?? {};
        this.gameDataStatic = settings['gameDataStatic'] ?? {};

        this.bankerService = settings['bankerService'] ?? null;
        this.betLogs = settings['betLogs'] ?? null;

        this.slotId = settings['slotId'] ?? '';
        this.playerId = settings['playerId'] ?? null;
        this.Balance = settings['balance'] ?? 0;
        this.Jackpots = settings['jackpots'] ?? {};

        this.goldsvetData = settings['state']?.['goldsvetData'] ?? {};
        this.SymbolGame = this.goldsvetData['symbol_game'] ?? [];

        this.userStatusEnum = 'BANNED';

        // Transform reel strips from arrays to "key=value" strings format
        const reelStripsData = settings['reelStrips'];
        const reelStrings: string[] = [];

        if (Array.isArray(reelStripsData)) {
            for (const [key, values] of Object.entries(reelStripsData)) {
                if (Array.isArray(values)) {
                    // Convert array of values to comma-separated string
                    reelStrings.push(key + '=' + values.join(','));
                } else {
                    // Keep as-is if already a string
                    reelStrings.push(values as string);
                }
            }
        }

        const reel = new GameReel(reelStrings);
        const reelStripNames = [
            'reelStrip1',
            'reelStrip2',
            'reelStrip3',
            'reelStrip4',
            'reelStrip5',
            'reelStrip6'
        ];
        for (const reelStrip of reelStripNames) {
            if (reel.reelsStrip[reelStrip] && reel.reelsStrip[reelStrip].length > 0) {
                (this as any)[reelStrip] = reel.reelsStrip[reelStrip];
            }
        }
        this.keyController = {
            '13': 'uiButtonSpin,uiButtonSkip',
            '49': 'uiButtonInfo',
            '50': 'uiButtonCollect',
            '51': 'uiButtonExit2',
            '52': 'uiButtonLinesMinus',
            '53': 'uiButtonLinesPlus',
            '54': 'uiButtonBetMinus',
            '55': 'uiButtonBetPlus',
            '56': 'uiButtonGamble',
            '57': 'uiButtonRed',
            '48': 'uiButtonBlack',
            '189': 'uiButtonAuto',
            '187': 'uiButtonSpin'
        };

        // 3. Init Denominations
        const denominationStr = this.goldsvetData['denomination'] ?? '';
        if (denominationStr) {
            this.Denominations = denominationStr.split(',').map((d: string) => parseFloat(d));
        } else {
            this.Denominations = [1.0];
        }

        // 4. Safe Property Access using object properties
        this.shop_id = this.shop?.id ?? 0;

        if (!this.playerId) {
            this.playerId = this.user?.id ?? 0;
        }

        if (this.user === null) {
            throw new Error('no user')
        }

        this.slotDBId = (this.game?.id ?? 0).toString();
        this.count_balance = this.user?.count_balance ?? 0;
        this.Percent = this.shop?.percent ?? 10;
        this.WinGamble = this.game?.rezerv ?? 0;
        this.MaxWin = this.shop?.max_win ?? 50000;

        // Denom Logic
        const gameDenoms = this.game?.denominations ?? [];
        if (this.Denominations.length === 0 && gameDenoms.length > 0) {
            this.Denominations = gameDenoms;
        }
        this.CurrentDenom = this.Denominations[0] ?? 1;
        this.increaseRTP = 1;

        this.slotCurrency = this.shop?.currency ?? 'USD';

        // Bank Logic
        if (settings['bank']) {
            this.Bank = settings['bank'];
        } else {
            this.Bank = this.shop?.balance ?? 1000;
        }

        this.logReport = [];
        this.internalError = [];
    }

    public initializeGameDataSafely(): void {
        if (!this.user?.session || this.user.session.length <= 0) {
            this.user.session = JSON.stringify({}); // Use JSON instead of serialize
        }
        // Handle user session data safely
        if (this.user && this.user.session) {
            const userSession = this.user.session;
            const gameData = this.safeUnserialize(userSession, {});

            // Clean up expired entries
            if (typeof gameData === 'object' && gameData !== null) {
                for (const [key, value] of Object.entries(gameData)) {
                    if (typeof value === 'object' && value !== null && 'timelife' in value && (value as any).timelife <= Date.now() / 1000) {
                        delete gameData[key];
                    }
                }
            }

            this.gameData = gameData;
        }

        // Handle game advanced data safely
        if (this.game && this.game.advanced) {
            const gameAdvanced = this.game.advanced;
            const gameDataStatic = this.safeUnserialize(gameAdvanced, {});

            // Clean up expired entries
            if (typeof gameDataStatic === 'object' && gameDataStatic !== null) {
                for (const [key, value] of Object.entries(gameDataStatic)) {
                    if (typeof value === 'object' && value !== null && 'timelife' in value && (value as any).timelife <= Date.now() / 1000) {
                        delete gameDataStatic[key];
                    }
                }
            }

            this.gameDataStatic = gameDataStatic;
        }
    }

    /**
     * Remove expired entries from game data
     */
    protected cleanupExpiredData(data: { [key: string]: any }): void {
        if (typeof data !== 'object' || data === null) {
            return;
        }

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null && 'timelife' in value && value.timelife <= Date.now() / 1000) {
                delete data[key];
            }
        }
    }

    /**
     * Convert array data to appropriate Model object
     * Maintains backward compatibility for existing objects
    //  */
    // protected convertToModel(data: any, type: string): any {
    //     if (data === null) {
    //         return null;
    //     }

    //     // If already an object, return as-is for backward compatibility
    //     if (typeof data === 'object' && !Array.isArray(data)) {
    //         return data;
    //     }

    //     // If array, convert to appropriate Model object
    //     if (Array.isArray(data)) {
    //         switch (type) {
    //             case 'user':
    //                 return data as User;
    //             case 'game':
    //                 return data as Game;
    //             case 'shop':
    //                 return data as Shop;
    //             default:
    //                 return data;
    //         }
    //     }

    //     return data;
    // }

    /**
     * Safely get a property value from either array or object (for backward compatibility)
     */
    protected getProperty(data: any, key: string, defaultValue: any = null): any {
        if (Array.isArray(data)) {
            return data[key] ?? defaultValue;
        } else if (typeof data === 'object' && data !== null && key in data) {
            return data[key] ?? defaultValue;
        } else {
            return defaultValue;
        }
    }

    /**
     * Safely call a method on object, return default if not available
     */
    protected callMethod(data: any, method: string, args: any[] = [], defaultValue: any = null): any {
        if (Array.isArray(data) || typeof data !== 'object' || data === null || !(method in data) || typeof data[method] !== 'function') {
            return defaultValue;
        } else {
            return data[method](...args);
        }
    }

    /**
     * Convert Model object back to array for backward compatibility
     * This allows legacy code that expects arrays to work with Model objects
     */
    protected toArray(data: any): any {
        if (data === null) {
            return null;
        }

        if (Array.isArray(data)) {
            return data;
        }

        if (typeof data === 'object') {
            // Use getState() or toArray() method if available
            if ('getState' in data && typeof data.getState === 'function') {
                return data.getState();
            } else if ('toArray' in data && typeof data.toArray === 'function') {
                return data.toArray();
            } else {
                // Fallback to casting
                return { ...data };
            }
        }

        return data;
    }

    /**
     * Update jackpot property safely for both array and object
     */
    protected updateJPGProperty(jpg: JPG, property: keyof JPG, value: any): void {
        if (typeof jpg === 'object' && jpg !== null) {
            (jpg as any)[property] = value;
        }
    }

    /**
     * Get jackpot property safely for both array and object
     */
    protected getJPGProperty(jpg: JPG, property: keyof JPG, defaultValue: any = null): any {
        if (typeof jpg === 'object' && jpg !== null) {
            return jpg[property] ?? defaultValue;
        }
        return defaultValue;
    }

    /**
     * FIXED: Always returns an array, never false or null
     */
    protected safeUnserialize(data: string, defaultValue: any = {}): any {
        if (typeof data !== 'string' || data.length === 0) {
            return defaultValue;
        }

        try {
            const result = JSON.parse(data); // Use JSON.parse instead of unserialize
            // Ensure we always return an object/array
            return typeof result === 'object' && result !== null ? result : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Magic method to safely handle gameData assignment
     */
    public __set(name: string, value: any): void {
        if (name === 'gameData') {
            // Ensure gameData is always an object
            if (value === false || !value) {
                this.gameData = this.safeUnserialize(this.user?.session ?? '', {});
            } else {
                this.gameData = value;
            }
        } else if (name === 'gameDataStatic') {
            // Ensure gameDataStatic is always an object
            if (value === false || !value) {
                this.gameDataStatic = this.safeUnserialize(this.game?.advanced ?? '', {});
            } else {
                this.gameDataStatic = value;
            }
        } else {
            // Default behavior for other properties
            (this as any)[name] = value;
        }
    }

    /**
     * Magic method to safely handle gameData access
     */
    public __get(name: string): any {
        if (name === 'gameData') {
            return this.gameData ?? this.safeUnserialize(this.user?.session ?? '', {});
        } else if (name === 'gameDataStatic') {
            return this.gameDataStatic ?? this.safeUnserialize(this.game?.advanced ?? '', {});
        }
        return null;
    }

    public is_active(): boolean {
        const game_view = this.game?.view ?? true;
        const shop_blocked = this.shop?.is_blocked ?? false;
        const user_blocked = this.user?.is_blocked ?? false;
        const user_status = this.user?.status ?? '';

        if (this.game && this.shop && this.user && (!game_view || shop_blocked || user_blocked || user_status == this.userStatusEnum)) {
            if (this.user) {
                // this.user.remember_token = null;
            }
            return false;
        }
        return game_view && !shop_blocked && !user_blocked && user_status != this.userStatusEnum;
    }

    public SetGameData(key: string, value: any): void {
        const timeLife = 86400;
        this.gameData[key] = {
            timelife: Date.now() / 1000 + timeLife,
            payload: value
        };
    }

    /**
     * FIXED: Get game data with safe default handling
     */
    public GetGameData(key: string): any {
        if (this.gameData[key]) {
            const payload = this.gameData[key].payload;
            // Ensure return value is always valid for count() operations
            return Array.isArray(payload) ? payload : (payload ?? []);
        } else {
            return []; // Return empty array instead of 0
        }
    }

    public FormatFloat(num: number): number {
        const str0 = num.toString().split('.');
        if (str0[1]) {
            if (str0[1].length > 4) {
                return Math.round(num * 100) / 100;
            } else if (str0[1].length > 2) {
                return Math.floor(num * 100) / 100;
            } else {
                return num;
            }
        } else {
            return num;
        }
    }

    public SaveGameData(): void {
        // Handle user data as Model object
        if (this.user) {
            this.user.session = JSON.stringify(this.gameData); // Use JSON.stringify instead of serialize
            if (this.user.save) {
                this.user.save();
            }
        }
    }

    public CheckBonusWin(): number {
        let allRateCnt = 0;
        let allRate = 0;
        // Support either older array-of-arrays or modern object mapping
        const paytableValues: number[][] = Array.isArray(this.Paytable) ? this.Paytable as any : Object.values(this.Paytable);
        for (const vl of paytableValues) {
            for (const vl2 of vl) {
                if (vl2 > 0) {
                    allRateCnt++;
                    allRate += vl2;
                    break;
                }
            }
        }
        return allRate / allRateCnt;
    }

    public GetRandomPay(): number {
        const allRate: number[] = [];
        const paytableValues: number[][] = Array.isArray(this.Paytable) ? this.Paytable as any : Object.values(this.Paytable);
        for (const vl of paytableValues) {
            for (const vl2 of vl) {
                if (vl2 > 0) {
                    allRate.push(vl2);
                }
            }
        }
        this.shuffleArray(allRate); // Use custom shuffle

        // Use Model object properties for game statistics
        const gameStatIn = this.game?.stat_in ?? 0;
        const gameStatOut = this.game?.stat_out ?? 0;

        if (gameStatIn < (gameStatOut + (allRate[0] * this.AllBet))) {
            allRate[0] = 0;
        }
        return allRate[0] ?? 0;
    }

    public HasGameDataStatic(key: string): boolean {
        if (this.gameDataStatic[key]) {
            return true;
        } else {
            return false;
        }
    }

    public SaveGameDataStatic(): void {
        // Handle game data as Model object
        if (this.game) {
            this.game.advanced = JSON.stringify(this.gameDataStatic);
            if (this.game.save) {
                this.game.save();
            }
            if (this.game.refresh) {
                this.game.refresh();
            }
        }
    }

    public SetGameDataStatic(key: string, value: any): void {
        const timeLife = 86400;
        this.gameDataStatic[key] = {
            timelife: Date.now() / 1000 + timeLife,
            payload: value
        };
    }

    public GetGameDataStatic(key: string): any {
        if (this.gameDataStatic[key]) {
            const data = this.gameDataStatic[key];
            // Handle both array and direct value access
            if (typeof data === 'object' && data !== null && 'payload' in data) {
                return data.payload;
            } else {
                return data; // Return the direct value if not in expected format
            }
        } else {
            return 0;
        }
    }

    public HasGameData(key: string): boolean {
        if (this.gameData[key]) {
            return true;
        } else {
            return false;
        }
    }

    public GetHistory(): any {
        const history = this.betLogs;
        this.lastEvent = 'NULL';
        let tmpLog: any = null;
        for (const log of history) {
            tmpLog = JSON.parse(log.str);
            if (tmpLog.responseEvent != 'gambleResult' && tmpLog.responseEvent != 'jackpot') {
                this.lastEvent = log.str;
                break;
            }
        }
        if (tmpLog) {
            return tmpLog;
        } else {
            return 'NULL';
        }
    }

    public UpdateJackpots(bet: number): void {
        // Safe return if no jackpots
        if (!this.jpgs) return;

        bet = bet * this.CurrentDenom;
        const count_balance = this.count_balance!;
        const jsum: number[] = [];
        let payJack = 0;

        for (let i = 0; i < this.jpgs.length; i++) {
            const jpg = this.jpgs[i];

            // Use safe property access for jackpot data
            const jpgBalance = this.getJPGProperty(jpg, 'balance', 0);
            const jpgPercent = this.getJPGProperty(jpg, 'percent', 10);
            const jpgUserId = this.getJPGProperty(jpg, 'user_id', null);
            const jpgStartBalance = this.getJPGProperty(jpg, 'start_balance', 0);

            // Calculate jackpot sum
            if (count_balance == 0 || this.jpgPercentZero) {
                jsum[i] = jpgBalance;
            } else if (count_balance < bet) {
                jsum[i] = count_balance / 100 * jpgPercent + jpgBalance;
            } else {
                jsum[i] = bet / 100 * jpgPercent + jpgBalance;
            }

            // For this stateless version, we'll use a simple condition for payout
            // In a real system, this would check against a payout threshold
            const payThreshold = jsum[i] * 0.1; // 10% threshold for demonstration
            const currentPaySum = jpgBalance * 0.05; // 5% of current balance for demo

            if (currentPaySum < jsum[i] && currentPaySum > 0) {
                const user_id = this.user?.id ?? 0;
                if (jpgUserId && jpgUserId != user_id) {
                    // Different user, skip
                } else {
                    payJack = currentPaySum / this.CurrentDenom;
                    jsum[i] = jsum[i] - currentPaySum;
                    this.SetBalance(currentPaySum / this.CurrentDenom);

                    if (currentPaySum > 0) {
                        // Second check (duplicate logic, but keeping for compatibility)
                        const user_id = this.user?.id ?? 0;
                        if (jpgUserId && jpgUserId != user_id) {
                            // Different user, skip
                        } else {
                            payJack = currentPaySum / this.CurrentDenom;
                            jsum[i] = jsum[i] - currentPaySum;
                            this.SetBalance(currentPaySum / this.CurrentDenom);
                            this.Jackpots['jackPay'] = payJack;
                        }
                    }
                }
            }

            // Update the jackpot balance using safe property update
            this.updateJPGProperty(jpg, 'balance', jsum[i]);

            // Check if balance falls below minimum threshold
            const minBalance = jpgStartBalance * 0.5; // 50% of start balance as minimum
            if (jsum[i] < minBalance && jpgStartBalance > 0) {
                const summ = jpgStartBalance;
                if (summ > 0) {
                    // For stateless version, just add to balance
                    jsum[i] += summ;
                    this.updateJPGProperty(jpg, 'balance', jsum[i]);
                }
            }
        }

        if (payJack > 0) {
            this.Jackpots['jackPay'] = payJack.toFixed(2);
        }
    }

    public GetBank(slotState: string = ''): number {
        if (this.isBonusStart || slotState == 'bonus' || slotState == 'freespin' || slotState == 'respin') {
            slotState = 'bonus';
        } else {
            slotState = '';
        }

        const game = this.game;

        // Use Model object methods for game bank access
        if (game && game.get_gamebank) {
            this.Bank = game.get_gamebank(slotState);
        } else {
            // Fallback for objects without get_gamebank or null game
            this.Bank = this.Bank ?? 10000;
        }

        return (this.Bank ?? 0) / this.CurrentDenom;
    }

    public GetPercent(): number {
        return this.Percent ?? 0;
    }

    public GetCountBalanceUser(): number {
        // Use Model object property for user count balance
        return this.user?.count_balance ?? 0;
    }

    public InternalError(errcode: string): never {
        throw new Error(errcode);
    }

    public InternalErrorSilent(errcode: string): void {
        Log.info('Internal Error Silent: ' + JSON.stringify(errcode));

        this.errorLogReport.push({
            type: 'internal_error',
            error_code: errcode,
            timestamp: Date.now() / 1000,
            slot_id: this.slotId,
            player_id: this.playerId,
            balance: this.GetBalance(),
            game_state: this.getState(),
            backtrace: new Error().stack // Simplified backtrace
        });
    }

    public SetBank(slotState: string = '', sum: number, slotEvent: string = ''): any {
        if (this.isBonusStart || slotState == 'bonus' || slotState == 'freespin' || slotState == 'respin') {
            slotState = 'bonus';
        } else {
            slotState = '';
        }
        if (this.GetBank(slotState) + sum < 0) {
            this.InternalError('Bank_   ' + sum + '  CurrentBank_ ' + this.GetBank(slotState) + ' CurrentState_ ' + slotState + ' Trigger_ ' + (this.GetBank(slotState) + sum));
        }
        sum = sum * this.CurrentDenom;
        const game = this.game;
        let bankBonusSum = 0;
        if (sum > 0 && slotEvent == 'bet') {
            this.toGameBanks = 0;
            this.toSlotJackBanks = 0;
            this.toSysJackBanks = 0;
            this.betProfit = 0;
            const prc = this.GetPercent();
            const prc_b = 10;
            if (prc <= prc_b) {
                // prc_b = 0; // Commented out as in original
            }
            const count_balance = this.count_balance!;
            const gameBet = sum / this.GetPercent() * 100;
            if (count_balance < gameBet && count_balance > 0) {
                const firstBid = count_balance;
                const secondBid = gameBet - firstBid;
                if (this.betRemains0) {
                    // secondBid = this.betRemains0; // Commented out
                }
                const bankSum = firstBid / 100 * this.GetPercent();
                sum = bankSum + secondBid;
                bankBonusSum = firstBid / 100 * prc_b;
            } else if (count_balance > 0) {
                bankBonusSum = gameBet / 100 * prc_b;
            }
            for (let i = 0; i < this.jpgs!.length; i++) {
                if (!this.jpgPercentZero) {
                    const jpg = this.jpgs![i];
                    const jpgPercent = jpg?.percent ?? 10;
                    if (count_balance < gameBet && count_balance > 0) {
                        this.toSlotJackBanks! += (count_balance / 100 * jpgPercent);
                    } else if (count_balance > 0) {
                        this.toSlotJackBanks! += (gameBet / 100 * jpgPercent);
                    }
                }
            }
            this.toGameBanks = sum;

            this.betProfit = gameBet - this.toGameBanks - this.toSlotJackBanks! - this.toSysJackBanks!;
        }
        if (sum > 0) {
            this.toGameBanks = sum;
        }
        if (bankBonusSum > 0) {
            sum -= bankBonusSum;
            // Use Model object methods for game bank
            if (game && game.set_gamebank) {
                game.set_gamebank(bankBonusSum, 'inc', 'bonus');
            } else {
                this.Bank = (this.Bank ?? 0) + bankBonusSum;
            }
        }
        if (sum == 0 && slotEvent == 'bet' && this.betRemains) {
            sum = this.betRemains;
        }

        // Use Model object methods for game bank and save
        if (game && game.set_gamebank) {
            game.set_gamebank(sum, 'inc', slotState);
            if (game.save) {
                game.save();
            }
        } else {
            this.Bank = (this.Bank ?? 0) + sum;
        }
        return game;
    }

    public SetBalance(sum: number, slotEvent: string = ''): any {
        if (this.GetBalance() + sum < 0) {
            this.InternalError('Balance_   ' + sum);
        }

        sum = sum * this.CurrentDenom;

        // Handle user data as Model object
        const user = this.user;

        if (sum < 0 && slotEvent == 'bet') {
            const userCountBalance = user?.count_balance ?? 0;
            const userAddress = user?.address ?? 0;

            if (userCountBalance == 0) {
                this.betRemains = 0;
                const sm = Math.abs(sum);
                if (userAddress < sm && userAddress > 0) {
                    // remains logic simplified
                }
                for (const remain of []) { // Simplified, no remains
                    if (this.betRemains! < remain) {
                        this.betRemains = remain;
                    }
                }
            }
            if (userCountBalance > 0 && userCountBalance < Math.abs(sum)) {
                const sm = Math.abs(sum);
                const tmpSum = sm - userCountBalance;
                this.betRemains0 = tmpSum;
                if (userAddress > 0) {
                    this.betRemains0 = 0;
                    if (userAddress < tmpSum && userAddress > 0) {
                        // remains0 logic simplified
                    }
                    for (const remain of []) {
                        if (this.betRemains0 < remain) {
                            this.betRemains0 = remain;
                        }
                    }
                }
            }
            const sum0 = Math.abs(sum);
            if (userCountBalance == 0) {
                const sm = Math.abs(sum);
                if (userAddress < sm && userAddress > 0) {
                    if (user) {
                        user.address = 0;
                    }
                } else if (userAddress > 0) {
                    const newAddress = userAddress - sm;
                    if (user) {
                        user.address = newAddress;
                    }
                }
            } else if (userCountBalance > 0 && userCountBalance < sum0) {
                const sm = sum0 - userCountBalance;
                if (userAddress < sm && userAddress > 0) {
                    if (user) {
                        user.address = 0;
                    }
                } else if (userAddress > 0) {
                    const newAddress = userAddress - sm;
                    if (user) {
                        user.address = newAddress;
                    }
                }
            }

            // Update count_balance (simplified logic for stateless version)
            const newCountBalance = Math.max(0, userCountBalance + sum);
            if (user) {
                user.count_balance = this.FormatFloat(newCountBalance);
            }
        }

        // Update balance
        const userBalance = user?.balance ?? 0;
        const newBalance = userBalance + sum;

        if (user) {
            user.balance = this.FormatFloat(newBalance);
            // For objects, call the increment method if available
            if (user.increment) {
                user.increment('balance', sum);
            }
            // Call save if available
            if (user.save) {
                user.save();
            }
        }

        return this.user;
    }

    public GetBalance(): number {
        const user = this.user;
        const userBalance = user?.balance ?? 0;
        this.Balance = userBalance / this.CurrentDenom;
        return this.Balance;
    }

    public SaveLogReport(response: any, allbet: number, lines: number, reportWin: number, slotEvent: string): void {
        this.logReport.push({
            response: response,
            allbet: allbet,
            lines: lines,
            reportWin: reportWin,
            slotEvent: slotEvent
        });
    }

    public GetGambleSettings(): number {
        const spinWin = Math.floor(Math.random() * this.WinGamble!) + 1; // rand(1, WinGamble)
        return spinWin;
    }

    public getState(): { [key: string]: any } {
        return {
            slotId: this.slotId,
            playerId: this.playerId,
            balance: this.GetBalance(),
            gameData: this.GameData,
            jackpots: this.Jackpots,
            logReport: this.logReport,
            errorLogReport: this.errorLogReport,
            internalError: this.internalError,
            user_balance: this.GetBalance(),
            game_bank: this.Bank,
            user: this.user,
            shop: this.shop,
            game: this.game
        };
    }

    // Utility method for shuffling array (replaces PHP shuffle)
    public shuffleArray(array: any[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}