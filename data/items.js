// アイテムのレアリティ定義
export const RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    LEGENDARY: 'legendary'
};

// アイテムの効果時間（ミリ秒）
export const DURATION = {
    ANNOYING_CUSTOMER_BLOCK: 60000,  // 60秒
    SUPER_FINGER: 10000,             // 10秒
    COIN_BONUS: 30000                // 30秒
};

// アイテムの状態管理
export const itemStates = {
    annoyingCustomerBlock: {
        timer: null
    },
    superFinger: {
        timer: null
    },
    coinBonus: {
        timer: null,
        multiplier: 2
    }
};

// アイテムの効果
const effects = {
    // 基本アイテムの効果
    healHealth: (game) => {
        game.state.health = Math.min(100, game.state.health + 30);
    },
    extendTime: (game) => {
        game.state.time += 2;
    },

    // 特殊アイテムの効果
    blockAnnoyingCustomer: (game) => {
        if (itemStates.annoyingCustomerBlock.timer) {
            clearTimeout(itemStates.annoyingCustomerBlock.timer);
        }
        itemStates.annoyingCustomerBlock.timer = setTimeout(() => {
            itemStates.annoyingCustomerBlock.timer = null;
        }, DURATION.ANNOYING_CUSTOMER_BLOCK);
    },

    activateSuperFinger: (game) => {
        if (itemStates.superFinger.timer) {
            clearTimeout(itemStates.superFinger.timer);
        }
        itemStates.superFinger.timer = setTimeout(() => {
            itemStates.superFinger.timer = null;
        }, DURATION.SUPER_FINGER);
    },

    activateCoinBonus: (game) => {
        if (itemStates.coinBonus.timer) {
            clearTimeout(itemStates.coinBonus.timer);
        }
        itemStates.coinBonus.timer = setTimeout(() => {
            itemStates.coinBonus.timer = null;
        }, DURATION.COIN_BONUS);
    },

    // 新メニューアイテムの効果
    addNewMenu: (word) => (game) => {
        const difficulty = word.difficulty || 'medium';
        game.state.unlockedWords[difficulty].push(word);
    }
};

// アイテムの効果チェックと処理
export const itemEffects = {
    // 迷惑客の出現確率を取得
    getTroubleCustomerChance: () => {
        return itemStates.annoyingCustomerBlock.timer ? 0 : 0.1;
    },

    // スーパーフィンガーの効果を処理
    handleSuperFinger: (game) => {
        if (itemStates.superFinger.timer) {
            const matchingEnemy = game.state.enemies[0];
            if (matchingEnemy) {
                game.processSuccessfulInput(matchingEnemy);
                return true;
            }
        }
        return false;
    },

    // コインボーナスの計算
    calculateCoinBonus: (score) => {
        if (itemStates.coinBonus.timer) {
            return Math.floor(score * itemStates.coinBonus.multiplier);
        }
        return 0;
    }
};

// 新メニューの定義
const newMenus = [
    {
        name: 'チーズケーキ',
        kana: 'チーズケーキ',
        hira: 'ちーずけーき',
        difficulty: 'medium',
        cost: 150,
        rarity: RARITY.UNCOMMON
    },
    {
        name: 'シェイク',
        kana: 'シェイク',
        hira: 'しぇいく',
        difficulty: 'medium',
        cost: 150,
        rarity: RARITY.UNCOMMON
    },
    {
        name: 'フライドチキン',
        kana: 'フライドチキン',
        hira: 'ふらいどちきん',
        difficulty: 'hard',
        cost: 200,
        rarity: RARITY.RARE
    },
    {
        name: 'ビッグバーガー',
        kana: 'ビッグバーガー',
        hira: 'びっぐばーがー',
        difficulty: 'hard',
        cost: 200,
        rarity: RARITY.RARE
    },
    {
        name: 'マルゲリータピザ',
        kana: 'マルゲリータピザ',
        hira: 'まるげりーたぴざ',
        difficulty: 'hard',
        cost: 180,
        rarity: RARITY.RARE
    },
    {
        name: 'カルボナーラ',
        kana: 'カルボナーラ',
        hira: 'かるぼなーら',
        difficulty: 'hard',
        cost: 180,
        rarity: RARITY.RARE
    }
];

// アイテムの定義
export const items = {
    // 基本アイテム
    base: [
        {
            name: '体力回復',
            description: 'HPを30回復',
            cost: 50,
            rarity: RARITY.COMMON,
            effect: effects.healHealth
        },
        {
            name: 'タイムプラス',
            description: '制限時間を2秒延長',
            cost: 60,
            rarity: RARITY.COMMON,
            effect: effects.extendTime
        }
    ],

    // 特殊アイテム
    special: [
        {
            name: '迷惑客バリア',
            description: '迷惑客の出現を60秒間防ぐ',
            cost: 100,
            rarity: RARITY.RARE,
            effect: effects.blockAnnoyingCustomer
        },
        {
            name: 'スーパーフィンガー',
            description: '10秒間、全てのタイピングが自動成功',
            cost: 200,
            rarity: RARITY.LEGENDARY,
            effect: effects.activateSuperFinger
        },
        {
            name: 'コインボーナス',
            description: '獲得コインが30秒間2倍',
            cost: 120,
            rarity: RARITY.RARE,
            effect: effects.activateCoinBonus
        }
    ],

    // 新メニューアイテム
    menu: newMenus.map(menu => ({
        name: `新メニュー：${menu.name}`,
        description: '高得点の新メニューを追加',
        cost: menu.cost,
        rarity: menu.rarity,
        effect: effects.addNewMenu({
            kana: menu.kana,
            hira: menu.hira,
            difficulty: menu.difficulty
        })
    }))
};

// アイテムの種類を取得
export const getItemTypes = () => Object.keys(items);

// 特定のレアリティのアイテムを取得
export const getItemsByRarity = (rarity) => {
    return Object.values(items)
        .flat()
        .filter(item => item.rarity === rarity);
};

// アイテムのコスト範囲を取得
export const getItemCostRange = () => {
    const allItems = Object.values(items).flat();
    return {
        min: Math.min(...allItems.map(item => item.cost)),
        max: Math.max(...allItems.map(item => item.cost))
    };
};

// アイテムの効果をリセット
export const resetItemStates = () => {
    Object.values(itemStates).forEach(state => {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
    });
};

// アイテムの効果が有効かチェック
export const isItemActive = (itemName) => {
    switch (itemName) {
        case '迷惑客バリア':
            return !!itemStates.annoyingCustomerBlock.timer;
        case 'スーパーフィンガー':
            return !!itemStates.superFinger.timer;
        case 'コインボーナス':
            return !!itemStates.coinBonus.timer;
        default:
            return false;
    }
}; 