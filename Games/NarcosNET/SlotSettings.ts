
import { BaseSlotSettings } from "../../BaseSlotSettings";
import { ISlotSettingsData } from "../../ISlotSettingsData";

export class SlotSettings extends BaseSlotSettings {

    public constructor(slotSettingsData: ISlotSettingsData) {
        // Pass data to BaseSlotSettings
        super(slotSettingsData);
        this.initializeFromGameState(slotSettingsData);
    }

    private initializeFromGameState(gameStateData: ISlotSettingsData): void {
        this.MaxWin = this.shop?.max_win ?? 50000;
        this.increaseRTP = 1;
        this.CurrentDenom = this.game?.denominations?.[0] ?? 1;
        this.scaleMode = 0;
        this.numFloat = 0;

        // Paytable configuration
        this.Paytable = {
            'SYM_0': [0, 0, 0, 0, 0, 0],
            'SYM_1': [0, 0, 0, 20, 80, 300],
            'SYM_2': [0, 0, 0, 0, 0, 0],
            'SYM_3': [0, 0, 0, 20, 80, 300],
            'SYM_4': [0, 0, 0, 20, 80, 300],
            'SYM_5': [0, 0, 0, 15, 60, 250],
            'SYM_6': [0, 0, 0, 15, 60, 250],
            'SYM_7': [0, 0, 0, 10, 30, 120],
            'SYM_8': [0, 0, 0, 10, 30, 120],
            'SYM_9': [0, 0, 0, 5, 15, 60],
            'SYM_10': [0, 0, 0, 5, 15, 60],
            'SYM_11': [0, 0, 0, 5, 10, 40],
            'SYM_12': [0, 0, 0, 5, 10, 40]
        };

        // Key Controller
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

        // Slot Reels Config
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
        this.slotWildMpl = 1;
        this.GambleType = 1;
        this.Denominations = this.game?.denominations ?? [1];
        this.CurrentDenom = this.Denominations[0] ?? 1;
        this.CurrentDenomination = this.Denominations[0] ?? 1;

        this.slotFreeCount = [0, 0, 0, 10, 10, 10];
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
        this.SymbolGame = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

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

    public GetRandomScatterPos(rp: string[], rsym: string): number {
        const rpResult: number[] = [];

        for (let i = 0; i < rp.length; i++) {
            if (rp[i] == rsym) {
                if (rsym == '2') {
                    if (rp[i + 1] && rp[i - 1]) {
                        rpResult.push(i + 1);
                    }
                } else {
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
        }

        this.shuffleArray(rpResult);

        if (rpResult.length === 0) {
            rpResult[0] = this.randomInt(2, rp.length - 3);
        }

        return rpResult[0];
    }

    public GetCluster(reels: any): any {
        // Logic ported from PHP GetCluster
        // Checks neighbors (left, top, right, bottom) for '2' or '2c' connectivity
        // Assuming reels['reelX'][row] format

        // Forward Pass (Top-Left to Bottom-Right)
        for (let r = 1; r <= 5; r++) {
            for (let p = 0; p <= 2; p++) {
                if (reels['reel' + r][p] == '2' || reels['reel' + r][p] == '2c') {
                    let connected = false;
                    // Check Left
                    if (r > 1 && reels['reel' + (r - 1)][p] == '2c') connected = true;
                    // Check Top
                    if (p > 0 && reels['reel' + r][p - 1] == '2c') connected = true;
                    // Check Right (if already processed and 2c)
                    if (r < 5 && reels['reel' + (r + 1)][p] == '2c') connected = true;
                    // Check Bottom
                    if (p < 2 && reels['reel' + r][p + 1] == '2c') connected = true;

                    if (connected) {
                        reels['reel' + r][p] = '2c';
                    }
                }
            }
        }

        // Backward Pass (Bottom-Right to Top-Left) to propagate connections back
        for (let r = 5; r >= 1; r--) {
            for (let p = 2; p >= 0; p--) {
                if (reels['reel' + r][p] == '2' || reels['reel' + r][p] == '2c') {
                    let connected = false;
                    if (r > 1 && reels['reel' + (r - 1)][p] == '2c') connected = true;
                    if (p > 0 && reels['reel' + r][p - 1] == '2c') connected = true;
                    if (r < 5 && reels['reel' + (r + 1)][p] == '2c') connected = true;
                    if (p < 2 && reels['reel' + r][p + 1] == '2c') connected = true;

                    if (connected) {
                        reels['reel' + r][p] = '2c';
                    }
                }
            }
        }
        return reels;
    }

    public GetGambleSettings(): number {
        const spinWin = this.randomInt(1, this.WinGamble ?? 0);
        return spinWin;
    }

    public GetReelStrips(winType: string, slotEvent: string): any {
        if (slotEvent == 'freespin') {
            const fArr = this.gameDataStatic?.reelsStripBonus; // Assuming bonus strips are stored here or need logic to load them
            // In original PHP: $reel = new GameReel(); $fArr = $reel->reelsStripBonus;
            // Since we don't have GameReel class fully migrated or injected, we rely on reelStrips being available or initialized.
            // For now, we assume reelStrips are already loaded into properties if they were passed in gameDataStatic or initialized.
            // If specific bonus strips logic is needed, it should be adapted.
            // However, looking at base class and init, reelStrips are loaded.
            // The original code loads from GameReel class directly.
            // We'll skip re-loading if they are already there or handled by caller.
        }

        const prs: { [key: number]: number } = {};

        if (winType != 'bonus') {
            for (let index = 0; index < ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'].length; index++) {
                const reelStrip = `reelStrip${index + 1}`;
                const reelData = (this as any)[reelStrip];
                if (Array.isArray(reelData) && reelData.length > 0) {
                    prs[index + 1] = this.randomInt(0, reelData.length - 3);
                }
            }
        } else {
            const randomBonusType = this.randomInt(1, 2);
            const reelsId = [1, 2, 3, 4, 5];

            if (randomBonusType == 1) {
                for (let i = 0; i < reelsId.length; i++) {
                    const reelData = (this as any)[`reelStrip${reelsId[i]}`];
                    if (i == 0 || i == 2 || i == 4) {
                        prs[reelsId[i]] = this.GetRandomScatterPos(reelData, '0');
                    } else {
                        prs[reelsId[i]] = this.randomInt(0, reelData.length - 3);
                    }
                }
            } else {
                const sCnt = this.randomInt(3, 5);
                for (let i = 0; i < reelsId.length; i++) {
                    const reelData = (this as any)[`reelStrip${reelsId[i]}`];
                    if (i < sCnt) {
                        prs[reelsId[i]] = this.GetRandomScatterPos(reelData, '2');
                    } else {
                        prs[reelsId[i]] = this.randomInt(0, reelData.length - 3);
                    }
                }
            }
        }

        const reel: any = {
            rp: []
        };

        for (const [index, value] of Object.entries(prs)) {
            const reelIndex = parseInt(index);
            const key = (this as any)[`reelStrip${reelIndex}`];
            if (key && key.length > 0) {
                const cnt = key.length;
                // Emulate PHP array[-1] access logic
                const v_minus_1 = value - 1 < 0 ? key[cnt - 1] : key[value - 1];

                reel[`reel${reelIndex}`] = [];
                reel[`reel${reelIndex}`][0] = v_minus_1; // key[$value - 1]
                reel[`reel${reelIndex}`][1] = key[value];
                reel[`reel${reelIndex}`][2] = value + 1 >= cnt ? key[0] : key[value + 1];
                reel[`reel${reelIndex}`][3] = '';
                reel['rp'].push(value);
            }
        }

        return reel;
    }

    private getLinesPercentConfig(type: string): { [key: string]: any } {
        // Implement default or load from gameDataStatic if available
        // This is a placeholder for the logic found in Game model in PHP
        const defaultConfig = {
            'line10': { '0_100': 100 },
             // ... populate with actual defaults if known or rely on gameDataStatic
        };
        // In original: $this->game->get_lines_percent_config('spin');
        // We assume this data might be passed in gameDataStatic or similar.
        // For now, returning empty object or need to know where this data comes from in TS.
        // Assuming it's part of gameDataStatic as per SpaceWars example
        const configKey = type === 'spin' ? 'linesPercentConfigSpin' : 'linesPercentConfigBonus';
        return this.gameDataStatic?.[configKey] || {};
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
