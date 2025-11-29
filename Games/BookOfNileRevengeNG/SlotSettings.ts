// SlotSettings.ts - BookOfNileRevengeNG game specific settings
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
        super(slotSettingsData);
        this.initializeFromGameState(slotSettingsData);
    }

    private initializeFromGameState(gameStateData: ISlotSettingsData): void {
        this.MaxWin = this.shop?.max_win ?? 50000;
        this.increaseRTP = 1;
        this.CurrentDenom = this.game?.denominations?.[0] ?? 1;
        this.scaleMode = 0;
        this.numFloat = 0;

        // Paytable configuration from PHP
        this.Paytable = {
            'SYM_0': [0, 0, 10, 100, 1000, 5000],
            'SYM_1': [0, 0, 5, 40, 400, 2000],
            'SYM_2': [0, 0, 5, 30, 100, 750],
            'SYM_3': [0, 0, 5, 30, 100, 750],
            'SYM_4': [0, 0, 0, 5, 40, 150],
            'SYM_5': [0, 0, 0, 5, 40, 150],
            'SYM_6': [0, 0, 0, 5, 25, 100],
            'SYM_7': [0, 0, 0, 5, 25, 100],
            'SYM_8': [0, 0, 0, 5, 25, 100],
            'SYM_9': [0, 0, 0, 2, 20, 200]
        };

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
        this.slotWildMpl = 1;
        this.GambleType = 1;
        this.slotFreeCount = 10;
        this.slotFreeMpl = 1;
        this.slotViewState = (this.game?.slotViewState || 'Normal');
        this.hideButtons = [];

        this.Line = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        this.gameLine = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

        this.Bet = this.game?.bet ? this.game.bet.split(',').map(b => parseFloat(b.trim())) : [1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 100, 200, 500];

        this.Balance = this.user?.balance ?? 0;
        this.SymbolGame = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        this.Bank = this.game?.balance ?? 0;
        this.Percent = this.shop?.percent ?? 90;
        this.WinGamble = this.game?.rezerv ?? 0;
        this.slotDBId = (this.game?.id ?? 0).toString();
        this.slotCurrency = this.shop?.currency ?? 'USD';
        this.count_balance = this.user?.count_balance ?? 0;

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
        const bonusReelStrips = this.gameDataStatic?.reelStripsBonus;
        if (bonusReelStrips) {
            for (const reelStrip of ['reelStripBonus1', 'reelStripBonus2', 'reelStripBonus3', 'reelStripBonus4', 'reelStripBonus5', 'reelStripBonus6']) {
                if (bonusReelStrips[reelStrip] && bonusReelStrips[reelStrip].length > 0) {
                    (this as any)[reelStrip] = bonusReelStrips[reelStrip];
                }
            }
        }
    }

    public GetSpinSettings(garantType: string = 'bet', bet: number, lines: number): [string, number] {
        let curField = 10;
        switch (lines) {
            case 10: curField = 10; break;
            case 9: case 8: curField = 9; break;
            case 7: case 6: curField = 7; break;
            case 5: case 4: curField = 5; break;
            case 3: case 2: curField = 3; break;
            case 1: curField = 1; break;
            default: curField = 10; break;
        }

        const pref = garantType !== 'bet' ? '_bonus' : '';
        this.AllBet = bet * lines;

        const linesPercentConfigSpin = this.getLinesPercentConfig('spin');
        const linesPercentConfigBonus = this.getLinesPercentConfig('bonus');
        const currentPercent = this.shop?.percent ?? 90;
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
        if (!this.HasGameDataStatic('SpinWinLimit')) this.SetGameDataStatic('SpinWinLimit', 0);
        if (!this.HasGameDataStatic('RtpControlCount')) this.SetGameDataStatic('RtpControlCount', RtpControlCount);

        const rtpRange = (this.game?.stat_in ?? 0) > 0 ? (this.game?.stat_out ?? 0) / (this.game?.stat_in ?? 1) * 100 : 0;
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
            if (rtpControlCount < (-1 * RtpControlCount) && currentPercent - 1 <= rtpRange && rtpRange <= (currentPercent + 2)) {
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
            if ((this.game?.stat_in ?? 0) < (this.CheckBonusWin() * bet + (this.game?.stat_out ?? 0)) || winLimit < (this.CheckBonusWin() * bet)) {
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

    public GetRandomScatterPos(rp: string[]): number {
        const rpResult: number[] = [];
        for (let i = 0; i < rp.length; i++) {
            if (rp[i] === '9') {
                if (rp[i + 1] && rp[i - 1]) rpResult.push(i);
                if (rp[i - 1] && rp[i - 2]) rpResult.push(i - 1);
                if (rp[i + 1] && rp[i + 2]) rpResult.push(i + 1);
            }
        }
        this.shuffleArray(rpResult);
        if (rpResult.length === 0) rpResult[0] = this.randomInt(2, rp.length - 3);
        return rpResult[0];
    }

    public GetGambleSettings(): number {
        return this.randomInt(1, this.WinGamble ?? 0);
    }

    public GetReelStrips(winType: string, slotEvent: string): ReelStrips {
        if (slotEvent === 'freespin') {
            const bonusReels = this.gameDataStatic?.reelStripsBonus;
            if (bonusReels) {
                for (const reelStrip of ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6']) {
                    if (bonusReels[reelStrip] && bonusReels[reelStrip].length > 0) {
                        (this as any)[reelStrip] = bonusReels[reelStrip];
                    }
                }
            }
        }

        const prs: { [key: number]: number } = {};
        if (winType !== 'bonus') {
            for (let index = 0; index < ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'].length; index++) {
                const reelStrip = `reelStrip${index + 1}`;
                const reelData = (this as any)[reelStrip];
                if (Array.isArray(reelData) && reelData.length > 0) {
                    prs[index + 1] = this.randomInt(0, reelData.length - 3);
                }
            }
        } else {
            const reelsId: number[] = [];
            for (let index = 0; index < ['reelStrip1', 'reelStrip2', 'reelStrip3', 'reelStrip4', 'reelStrip5', 'reelStrip6'].length; index++) {
                const reelStrip = `reelStrip${index + 1}`;
                const reelData = (this as any)[reelStrip];
                if (Array.isArray(reelData) && reelData.length > 0) {
                    reelsId.push(index + 1);
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
        }

        const reel: ReelStrips = { rp: [] };
        for (const [index, value] of Object.entries(prs)) {
            const reelIndex = parseInt(index);
            const key = (this as any)[`reelStrip${reelIndex}`];
            if (key && key.length > 0) {
                const cnt = key.length;
                const v_1 = value - 1 < 0 ? key[cnt - 1] : key[value - 1];
                const v0 = key[value];
                const v1 = value + 1 >= cnt ? key[0] : key[value + 1];

                reel[`reel${reelIndex}`] = [v_1, v0, v1, ''];
                (reel['rp'] as number[]).push(value);
            }
        }
        return reel;
    }

    private getLinesPercentConfig(type: string): { [key: string]: any } {
        const defaultConfig = {
            'line10': { '0_100': 100 },
            'line10_bonus': { '0_100': 100 }
        };
        const configKey = type === 'spin' ? 'linesPercentConfigSpin' : 'linesPercentConfigBonus';
        return this.gameDataStatic?.[configKey] || defaultConfig;
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}