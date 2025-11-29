// SlotSettings.ts - CleosHeartNG game specific settings
// Converted from PHP following CONVERT_TO_TYPESCRIPT.md guidelines

import { BaseSlotSettings } from "../../BaseSlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

// Strongly-typed reel strips: 'rp' is reel positions array and each reel may be a string|number array
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

        // Paytable configuration for CleosHeartNG
        this.Paytable = {
            'SYM_0': [0, 0, 0, 0, 0, 0],
            'SYM_1': [0, 0, 0, 5, 20, 80],
            'SYM_2': [0, 0, 0, 4, 8, 20],
            'SYM_3': [0, 0, 0, 3, 6, 12],
            'SYM_4': [0, 0, 0, 2, 4, 10],
            'SYM_5': [0, 0, 0, 2, 4, 10],
            'SYM_6': [0, 0, 0, 1, 3, 6],
            'SYM_7': [0, 0, 0, 1, 3, 6],
            'SYM_8': [0, 0, 0, 1, 2, 5],
            'SYM_9': [0, 0, 0, 1, 2, 5],
            'SYM_10': [0, 0, 0, 0, 0, 0]
        };

        // Key controller configuration
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

        // Slot reels configuration
        this.slotReelsConfig = [
            [425, 142, 3],
            [669, 142, 3],
            [913, 142, 3],
            [1157, 142, 3],
            [1401, 142, 3]
        ];

        // Game configuration
        this.slotBonusType = 1;
        this.slotScatterType = 0;
        this.splitScreen = false;
        this.slotBonus = true;
        this.slotGamble = true;
        this.slotFastStop = 1;
        this.slotExitUrl = '/';
        this.slotWildMpl = 1;
        this.GambleType = 1;
        this.slotFreeCount = 8;
        this.slotFreeMpl = 1;

        // Get view state from game or default to Normal
        this.slotViewState = (this.game?.slotViewState || 'Normal');

        this.hideButtons = [];

        // Lines configuration
        this.Line = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        this.gameLine = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

        // Bet configuration from game
        this.Bet = this.game?.bet ? this.game.bet.split(',').map(b => parseInt(b.trim())) : [1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 100, 200, 300];

        this.Balance = this.user?.balance ?? 0;

        // Symbol game configuration
        this.SymbolGame = ['0', '1', 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

        // Bank and percentage settings
        this.Bank = this.game?.balance ?? 1000;
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

        // Initialize reel strips from GameReel if available
        this.initializeReelStrips();
    }

    private initializeReelStrips(): void {
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

        currentSpinWinChance = configData[percentLevel] || 20;
        currentBonusWinChance = (linesPercentConfigBonus[configKey] || {})[percentLevel] || 50;

        const RtpControlCount = 30;

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
            if (rtpControlCount < (-1 * (RtpControlCount * 3)) &&
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

    public GetRandomScatterPos(rp: string[]): number {
        const rpResult: number[] = [];

        for (let i = 0; i < rp.length; i++) {
            if (rp[i] === '10') {
                if (rp[i + 1] && rp[i - 1]) {
                    rpResult.push(i);
                }
                if (rp[i - 1] && rp[i - 2]) {
                    rpResult.push(i - 1);
                }
                if (rp[i + 1] && rp[i + 2]) {
                    rpResult.push(i + 1);
                }
            }
        }

        this.shuffleArray(rpResult);

        if (rpResult.length === 0) {
            rpResult[0] = this.randomInt(2, rp.length - 3);
        }

        return rpResult[0];
    }

    public GetReelStrips(winType: string, slotEvent: string): ReelStrips {
        const prs: { [key: number]: number } = {};

        // Handle freespin bonus reel strips
        if (slotEvent === 'freespin') {
            const reelStrips = this.gameDataStatic?.reelStripsBonus;
            if (reelStrips) {
                const fArr = [...reelStrips];
                for (const reelStrip of ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6']) {
                    const curReel = fArr.shift();
                    if (curReel && curReel.length > 0) {
                        (this as any)[reelStrip] = curReel;
                    }
                }
            }
        }

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
                    prsLocal[index + 1] = this.GetRandomScatterPos(reelData);
                    reelsId.push(index + 1);
                }
            }

            // Fixed reelsId for bonus mode as per original PHP
            reelsId.length = 0;
            reelsId.push(1, 2, 3, 4, 5);

            for (let i = 0; i < reelsId.length; i++) {
                if (i < 4 && i > 0) {
                    prs[reelsId[i]] = this.GetRandomScatterPos((this as any)[`reelStrip${reelsId[i]}`]);
                } else {
                    const reelData = (this as any)[`reelStrip${reelsId[i]}`];
                    prs[reelsId[i]] = this.randomInt(0, reelData.length - 3);
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
                // Handle wrapping for end of reel
                const cnt = key.length;
                const v_minus_1 = value - 1 < 0 ? key[cnt - 1] : key[value - 1];
                const v_plus_1 = value + 1 >= cnt ? key[0] : key[value + 1];
                const v_plus_2 = value + 2 >= cnt ? key[value + 2 - cnt] : key[value + 2];

                const reelData: (string | number)[] = [];
                reelData[0] = v_minus_1;
                reelData[1] = key[value];
                reelData[2] = v_plus_1;
                
                // Special handling for reels 1 and 5 (index 1 and 5)
                if (reelIndex === 1 || reelIndex === 5) {
                    reelData[3] = -1;
                } else {
                    reelData[3] = v_plus_2;
                }
                
                reelData[4] = '';

                reel[`reel${reelIndex}`] = reelData;
                (reel['rp'] as number[]).push(value);
            }
        }

        return reel;
    }

    public Ways1024ToLine(): any[][][] {
        const lines2: number[][] = [];
        for (let i0 = 1; i0 <= 4; i0++) {
            for (let i1 = 1; i1 <= 4; i1++) {
                lines2.push([i0, i1, 0, 0, 0]);
            }
        }

        const lines3: number[][] = [];
        for (let i0 = 1; i0 <= 4; i0++) {
            for (let i1 = 1; i1 <= 4; i1++) {
                for (let i2 = 1; i2 <= 4; i2++) {
                    lines3.push([i0, i1, i2, 0, 0]);
                }
            }
        }

        const lines4: number[][] = [];
        for (let i0 = 1; i0 <= 4; i0++) {
            for (let i1 = 1; i1 <= 4; i1++) {
                for (let i2 = 1; i2 <= 4; i2++) {
                    for (let i3 = 1; i3 <= 4; i3++) {
                        lines4.push([i0, i1, i2, i3, 0]);
                    }
                }
            }
        }

        const lines5: number[][] = [];
        for (let i0 = 1; i0 <= 4; i0++) {
            for (let i1 = 1; i1 <= 4; i1++) {
                for (let i2 = 1; i2 <= 4; i2++) {
                    for (let i3 = 1; i3 <= 4; i3++) {
                        for (let i4 = 1; i4 <= 4; i4++) {
                            lines5.push([i0, i1, i2, i3, i4]);
                        }
                    }
                }
            }
        }

        return [lines2, lines3, lines4, lines5];
    }

    private getLinesPercentConfig(type: string): { [key: string]: any } {
        const defaultConfig = {
            'line1': { '1_100': 20 },
            'line3': { '1_100': 15 },
            'line5': { '1_100': 12 },
            'line7': { '1_100': 10 },
            'line9': { '1_100': 8 },
            'line10': { '1_100': 6 },
            'line1_bonus': { '1_100': 100 },
            'line3_bonus': { '1_100': 80 },
            'line5_bonus': { '1_100': 60 },
            'line7_bonus': { '1_100': 50 },
            'line9_bonus': { '1_100': 40 },
            'line10_bonus': { '1_100': 35 }
        };

        const configKey = type === 'spin' ? 'linesPercentConfigSpin' : 'linesPercentConfigBonus';
        return this.gameDataStatic?.[configKey] || defaultConfig;
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}