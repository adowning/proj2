// SlotSettings.ts - HalloweenJackNET game specific settings
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines

import { BaseSlotSettings } from "../../BaseSlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

// Strongly-typed reel strips
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

export class SlotSettings extends BaseSlotSettings {

    public constructor(slotSettingsData: ISlotSettingsData) {
        // Pass data to BaseSlotSettings
        super(slotSettingsData);
        this.initializeFromGameState(slotSettingsData);
    }

    private initializeFromGameState(gameStateData: ISlotSettingsData): void {
        // Initialize game-specific properties
        this.MaxWin = this.shop?.max_win ?? 50000;
        this.increaseRTP = 1;
        this.CurrentDenom = this.game?.denominations?.[0] ?? 1;
        this.scaleMode = 0;
        this.numFloat = 0;

        // Paytable configuration
        this.Paytable = {
            'SYM_0': [0, 0, 0, 0, 0, 0],
            'SYM_1': [0, 0, 0, 0, 0, 0],
            'SYM_2': [0, 0, 0, 0, 0, 0],
            'SYM_3': [0, 0, 0, 20, 200, 1000],
            'SYM_4': [0, 0, 0, 15, 100, 750],
            'SYM_5': [0, 0, 0, 10, 50, 250],
            'SYM_6': [0, 0, 0, 10, 50, 250],
            'SYM_7': [0, 0, 0, 8, 30, 125],
            'SYM_8': [0, 0, 0, 6, 25, 100],
            'SYM_9': [0, 0, 0, 5, 20, 75],
            'SYM_10': [0, 0, 0, 5, 20, 75],
            'SYM_11': [0, 0, 0, 4, 15, 50],
            'SYM_12': [0, 0, 0, 3, 10, 30]
        };

        // Initialize reel strips from GameReel if available
        this.initializeReelStrips();

        // Game configuration
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

        this.slotReelsConfig = [
            [425, 142, 3],
            [669, 142, 3],
            [913, 142, 3],
            [1157, 142, 3],
            [1401, 142, 3]
        ];

        this.slotBonusType = 1;
        this.slotScatterType = 0;
        this.splitScreen = false;
        this.slotBonus = true;
        this.slotGamble = true;
        this.slotFastStop = 1;
        this.slotExitUrl = '/';
        this.slotWildMpl = 3;
        this.GambleType = 1;

        // Denominations
        this.Denominations = this.game?.denominations ?? [1.0];
        this.CurrentDenom = this.Denominations[0];
        this.CurrentDenomination = this.Denominations[0];

        this.slotFreeCount = [0, 0, 0, 10, 10, 10];
        this.slotFreeMpl = 1;

        // Get view state from game or default to Normal
        this.slotViewState = (this.game?.slotViewState || 'Normal');

        this.hideButtons = [];

        // Jackpots
        this.slotJackPercent = [];
        this.slotJackpot = [];
        if (this.game) {
            // Note: Typescript doesn't allow dynamic property access like PHP $game->{'jp_' . $jp} easily without 'any'
            // Assuming these properties might exist on the game object or handled differently in TS base
        }

        // Lines configuration
        this.Line = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        this.gameLine = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

        // Bet configuration from game
        this.Bet = this.game?.bet ? this.game.bet.split(',').map(b => parseFloat(b.trim())) : [];

        this.Balance = this.user?.balance ?? 0;

        // Symbol game configuration
        this.SymbolGame = ['1', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

        // Bank and percentage settings
        this.Bank = this.game?.balance ?? 0; // In PHP: $game->get_gamebank() which defaults to something?
        // BaseSlotSettings seems to handle get_gamebank via `GetBank`. Here we just need initial value if accessed directly.

        this.Percent = this.shop?.percent ?? 10;
        this.WinGamble = this.game?.rezerv ?? 0;
        this.slotDBId = (this.game?.id ?? 0).toString();
        this.slotCurrency = this.shop?.currency ?? 'USD';
        this.count_balance = this.user?.count_balance ?? 0;

        // Handle special percentage cases
        if ((this.user?.address ?? 0) > 0 && this.user?.count_balance === 0) {
            this.Percent = 0;
            this.jpgPercentZero = true;
        } else if (this.user?.count_balance === 0) {
            this.Percent = 100;
        }

        // Ensure gameData is initialized
        if (!this.gameData) {
             // Handled in BaseSlotSettings
        }
    }

    private initializeReelStrips(): void {
        // In PHP, this copies from GameReel to $this->reelStripX
        // In TS BaseSlotSettings, it tries to do this from gameDataStatic.
        // We ensure it's done here if needed.
        const reelStrips = this.gameDataStatic?.reelStrips;

        if (reelStrips) {
            for (const reelStrip of ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6']) {
                if (reelStrips[reelStrip] && reelStrips[reelStrip].length > 0) {
                    (this as any)[reelStrip] = reelStrips[reelStrip];
                }
            }
        }
    }

    public GetSpinSettings(garantType: string = 'bet', bet: number, lines: number): [string, number] {
        let curField = 10;

        switch (lines) {
            case 10:
                curField = 10;
                break;
            case 9:
            case 8:
                curField = 9;
                break;
            case 7:
            case 6:
                curField = 7;
                break;
            case 5:
            case 4:
                curField = 5;
                break;
            case 3:
            case 2:
                curField = 3;
                break;
            case 1:
                curField = 1;
                break;
            default:
                curField = 10;
                break;
        }

        const pref = garantType !== 'bet' ? '_bonus' : '';
        this.AllBet = bet * lines;

        // Get RTP control configuration
        const linesPercentConfigSpin = this.getLinesPercentConfig('spin');
        const linesPercentConfigBonus = this.getLinesPercentConfig('bonus');

        const currentPercent = this.shop?.percent ?? 10;
        let currentSpinWinChance = 0;
        let currentBonusWinChance = 0;
        let percentLevel = '';

        const configKey = `line${curField}${pref}`;
        const configData = linesPercentConfigSpin[configKey] || {};

        for (const k of Object.keys(configData)) {
            const [l0, l1] = k.split('_').map(Number);
            if (l0 <= currentPercent && currentPercent <= l1) {
                percentLevel = k;
                break;
            }
        }

        currentSpinWinChance = configData[percentLevel] || 0; // Default to 0 as in PHP it accesses array directly
        currentBonusWinChance = (linesPercentConfigBonus[configKey] || {})[percentLevel] || 0;

        const RtpControlCount = 200;

        if (!this.HasGameDataStatic('SpinWinLimit')) {
            this.SetGameDataStatic('SpinWinLimit', 0);
        }

        if (!this.HasGameDataStatic('RtpControlCount')) {
            this.SetGameDataStatic('RtpControlCount', RtpControlCount);
        }

        const rtpRange = (this.game?.stat_in ?? 0) > 0 ?
            (this.game?.stat_out ?? 0) / (this.game?.stat_in ?? 1) * 100 : 0;

        const rtpControlCount = this.GetGameDataStatic('RtpControlCount');
        const spinWinLimit = this.GetGameDataStatic('SpinWinLimit');

        if (rtpControlCount === 0) {
            if (currentPercent + this.randomInt(1, 2) < rtpRange && spinWinLimit <= 0) {
                this.SetGameDataStatic('SpinWinLimit', this.randomInt(25, 50));
            }
            if (pref === '' && spinWinLimit > 0) {
                currentBonusWinChance = 5000;
                currentSpinWinChance = 20;
                this.MaxWin = this.randomInt(1, 5);
                if (rtpRange < (currentPercent - 1)) {
                    this.SetGameDataStatic('SpinWinLimit', 0);
                    this.SetGameDataStatic('RtpControlCount', rtpControlCount - 1);
                }
            }
        } else if (rtpControlCount < 0) {
            if (currentPercent + this.randomInt(1, 2) < rtpRange && spinWinLimit <= 0) {
                this.SetGameDataStatic('SpinWinLimit', this.randomInt(25, 50));
            }
            this.SetGameDataStatic('RtpControlCount', rtpControlCount - 1);
            if (pref === '' && spinWinLimit > 0) {
                currentBonusWinChance = 5000;
                currentSpinWinChance = 20;
                this.MaxWin = this.randomInt(1, 5);
                if (rtpRange < (currentPercent - 1)) {
                    this.SetGameDataStatic('SpinWinLimit', 0);
                }
            }
            if (rtpControlCount < (-1 * RtpControlCount) &&
                currentPercent - 1 <= rtpRange && rtpRange <= (currentPercent + 2)) {
                this.SetGameDataStatic('RtpControlCount', RtpControlCount);
            }
        } else {
            this.SetGameDataStatic('RtpControlCount', rtpControlCount - 1);
        }

        const bonusWin = this.randomInt(1, currentBonusWinChance);
        const spinWin = this.randomInt(1, currentSpinWinChance);
        let returnValue: [string, number] = ['none', 0];

        if (bonusWin === 1 && this.slotBonus) {
            this.isBonusStart = true;
            garantType = 'bonus';
            const winLimit = this.GetBank(garantType);
            returnValue = ['bonus', winLimit];

            if ((this.game?.stat_in ?? 0) < (this.CheckBonusWin() * bet + (this.game?.stat_out ?? 0)) ||
                winLimit < (this.CheckBonusWin() * bet)) {
                returnValue = ['none', 0];
            }
        } else if (spinWin === 1) {
            const winLimit = this.GetBank(garantType);
            returnValue = ['win', winLimit];
        }

        // Special case for low balance
        if (garantType === 'bet' && this.GetBalance() <= (2 / this.CurrentDenom)) {
            const randomPush = this.randomInt(1, 10);
            if (randomPush === 1) {
                const winLimit = this.GetBank('');
                returnValue = ['win', winLimit];
            }
        }

        return returnValue;
    }

    public getNewSpin(game: any, spinWin: number, bonusWin: number, lines: number, garantType: string = 'bet'): any {
        let curField = 10;
        switch (lines) {
            case 10:
                curField = 10;
                break;
            case 9:
            case 8:
                curField = 9;
                break;
            case 7:
            case 6:
                curField = 7;
                break;
            case 5:
            case 4:
                curField = 5;
                break;
            case 3:
            case 2:
                curField = 3;
                break;
            case 1:
                curField = 1;
                break;
            default:
                curField = 10;
                break;
        }

        const pref = garantType !== 'bet' ? '_bonus' : '';
        let win: any[] = [];

        if (spinWin) {
            win = (game?.game_win?.[`winline${pref}${curField}`] || '').split(',');
        }
        if (bonusWin) {
            win = (game?.game_win?.[`winbonus${pref}${curField}`] || '').split(',');
        }

        const number = this.randomInt(0, win.length - 1);
        return win[number];
    }

    public GetRandomScatterPos(rp: any[]): number {
        const rpResult: number[] = [];

        for (let i = 0; i < rp.length; i++) {
            if (rp[i] === '0') { // Scatter symbol is '0' in HalloweenJack
                if (rp[i + 1] !== undefined && rp[i - 1] !== undefined) {
                    rpResult.push(i);
                }
                if (rp[i - 1] !== undefined && rp[i - 2] !== undefined) {
                    rpResult.push(i - 1);
                }
                if (rp[i + 1] !== undefined && rp[i + 2] !== undefined) {
                    rpResult.push(i + 1);
                }
            }
        }

        this.shuffleArray(rpResult);

        if (rpResult.length === 0) {
            // Default fallback if no valid scatter position found, although logic implies we shouldn't be here without check
            rpResult[0] = this.randomInt(2, rp.length - 3);
        }

        return rpResult[0] ?? 0;
    }

    public GetGambleSettings(): number {
        const spinWin = this.randomInt(1, this.WinGamble ?? 0);
        return spinWin;
    }

    public GetReelStrips(winType: string, slotEvent: string): ReelStrips {
        if (slotEvent === 'freespin') {
            // In PHP: $reel = new GameReel(); $fArr = $reel->reelsStripBonus;
            // Here we assume reelStripBonusX are available or handled via similar logic
            // The PHP code resets reelStrip1..6 from reelStripBonus1..6 logic

            // Implementation of switching strips for freespin if they exist
             // In BaseSlotSettings or ISlotSettingsData we should have these.
             // If they are in gameDataStatic, we might need to load them.

             // For now, assuming they are loaded into properties if they exist
        }

        const prs: { [key: number]: number } = {};

        if (winType !== 'bonus') {
            // Regular spin - random positions
            for (let index = 0; index < ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'].length; index++) {
                const reelStrip = `reelStrip${index + 1}`;
                const reelData = (this as any)[reelStrip];
                if (Array.isArray(reelData) && reelData.length > 0) {
                    prs[index + 1] = this.randomInt(0, reelData.length - 3);
                }
            }
        } else {
            // Bonus spin - ensure scatters
            const reelsId: number[] = [];
            const prsLocal: { [key: number]: number } = {};

            for (let index = 0; index < ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'].length; index++) {
                const reelStrip = `reelStrip${index + 1}`;
                const reelData = (this as any)[reelStrip];
                if (Array.isArray(reelData) && reelData.length > 0) {
                     // Check if this reel has scatter '0'
                    if (reelData.includes('0')) {
                        prsLocal[index + 1] = this.GetRandomScatterPos(reelData);
                        reelsId.push(index + 1);
                    }
                }
            }

            const scattersCnt = this.randomInt(3, reelsId.length);
            this.shuffleArray(reelsId);

            for (let i = 0; i < reelsId.length; i++) {
                if (i < scattersCnt) {
                    prs[reelsId[i]] = this.GetRandomScatterPos((this as any)[`reelStrip${reelsId[i]}`]);
                } else {
                    const reelData = (this as any)[`reelStrip${reelsId[i]}`];
                    prs[reelsId[i]] = this.randomInt(0, reelData.length - 3);
                }
            }

            // Fill remaining reels that were not in reelsId (no scatters or not chosen)
            for (let index = 0; index < 6; index++) {
                if (!prs[index + 1]) {
                     const reelStrip = `reelStrip${index + 1}`;
                     const reelData = (this as any)[reelStrip];
                     if (Array.isArray(reelData) && reelData.length > 0) {
                         prs[index + 1] = this.randomInt(0, reelData.length - 3);
                     }
                }
            }
        }

        const reel: ReelStrips = {
            rp: []
        };

        for (const [index, value] of Object.entries(prs)) {
            const reelIndex = parseInt(index);
            const key = (this as any)[`reelStrip${reelIndex}`];
            if (key && key.length > 0) {
                // Handle wrapping for end of reel. PHP logic:
                // $key[-1] = $key[$cnt - 1]; $key[$cnt] = $key[0];
                // $reel['reel' . $index][0] = $key[$value - 1];
                // $reel['reel' . $index][1] = $key[$value];
                // $reel['reel' . $index][2] = $key[$value + 1];

                const cnt = key.length;
                const v_minus_1 = value - 1 < 0 ? key[cnt - 1] : key[value - 1];
                const v_0 = key[value];
                const v_plus_1 = value + 1 >= cnt ? key[0] : key[value + 1];

                reel[`reel${reelIndex}`] = [
                    v_minus_1,
                    v_0,
                    v_plus_1,
                    '' // PHP has empty string as 4th element
                ];
                (reel['rp'] as number[]).push(value);
            }
        }

        return reel;
    }

    private getLinesPercentConfig(type: string): { [key: string]: any } {
        // Fallback or load from static data
        // In PHP this calls $this->game->get_lines_percent_config($type) which likely fetches from DB or config
        // Here we assume it's passed via gameDataStatic or use defaults

        // This default data is not in the PHP file explicitly, but used in GetSpinSettings
        // We will try to get it from gameDataStatic if available, else return empty object to avoid crash
        // The SpaceWarsNET implementation had defaults. We can leave it empty or mock it.
        const configKey = type === 'spin' ? 'linesPercentConfigSpin' : 'linesPercentConfigBonus';
        return this.gameDataStatic?.[configKey] || {};
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
