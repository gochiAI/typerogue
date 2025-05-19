// アビリティのレアリティ定義
export const RARITY = {
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
};

// アビリティの状態管理
export const abilityStates = {
    doubleOrder: {
        active: false,
        chance: 0.3,
        multiplier: 2
    },
    quickHand: {
        active: false,
        speedBonus: 0.1
    },
    lunchMaster: {
        active: false,
        speedMultiplier: 0.8,
        timeMultiplier: 1.2
    }
};

// アビリティの効果
const effects = {
    // スマートレジの効果
    smartRegister: (game) => {
        const wordCounts = new Map();
        game.state.enemies.forEach(enemy => {
            const key = enemy.word.kana;
            wordCounts.set(key, (wordCounts.get(key) || 0) + 1);
        });

        wordCounts.forEach((count, word) => {
            if (count >= 2) {
                const matchingEnemies = game.state.enemies.filter(e => e.word.kana === word);
                matchingEnemies.forEach(enemy => {
                    game.state.score += game.getScoreForWord(enemy.difficulty);
                });
                game.state.enemies = game.state.enemies.filter(e => e.word.kana !== word);
            }
        });
    },

    // チップティップの効果
    tipTip: (game) => {
        game.state.enemies.forEach(enemy => {
            const timeLeft = (enemy.timeLimit - (Date.now() - enemy.spawnTime)) / 1000;
            if (timeLeft > 0) {
                const bonus = Math.floor(timeLeft * 0.5);
                game.state.coins += bonus;
            }
        });
    },

    // タイムセーバーの効果
    timeSaver: (game) => {
        game.state.enemies.forEach(enemy => {
            enemy.timeLimit = Math.floor(enemy.timeLimit * 1.1);
        });
    },

    // ランチマスターの効果
    lunchMaster: (game) => {
        abilityStates.lunchMaster.active = true;
    },

    // ダブルオーダーの効果
    doubleOrder: (game) => {
        abilityStates.doubleOrder.active = true;
    },

    // クイックハンドの効果
    quickHand: (game) => {
        abilityStates.quickHand.active = true;
    }
};

// アビリティの定義
export const abilities = {
    smartRegister: {
        name: 'スマートレジ',
        description: '同じ商品の客を一斉に消す',
        cost: 100,
        rarity: RARITY.RARE,
        effect: effects.smartRegister
    },
    tipTip: {
        name: 'チップティップ',
        description: '残り時間を多く残すほどコインが貰える',
        cost: 150,
        rarity: RARITY.EPIC,
        effect: effects.tipTip
    },
    timeSaver: {
        name: 'タイムセーバー',
        description: '全ての注文の制限時間が10%延長される',
        cost: 120,
        rarity: RARITY.RARE,
        effect: effects.timeSaver
    },
    lunchMaster: {
        name: 'ランチマスター',
        description: 'ランチタイム中の難易度上昇を軽減',
        cost: 180,
        rarity: RARITY.EPIC,
        effect: effects.lunchMaster
    },
    doubleOrder: {
        name: 'ダブルオーダー',
        description: 'ランダムで一部の注文が2倍スコアになる',
        cost: 140,
        rarity: RARITY.RARE,
        effect: effects.doubleOrder
    },
    quickHand: {
        name: 'クイックハンド',
        description: 'タイピング速度が10%上昇（入力判定が甘くなる）',
        cost: 120,
        rarity: RARITY.RARE,
        effect: effects.quickHand
    }
};

// アビリティの初期状態を生成
export const createInitialAbilities = () => {
    return Object.keys(abilities).reduce((acc, key) => {
        acc[key] = {
            ...abilities[key],
            active: false,
            purchased: false
        };
        return acc;
    }, {});
};

// ショップ用のアビリティリストを生成
export const getShopAbilities = (currentAbilities) => {
    return Object.entries(currentAbilities)
        .filter(([_, ability]) => !ability.purchased)
        .map(([key, ability]) => ({
            type: 'ability',
            ...ability
        }));
};

// アビリティの効果を適用
export const applyAbilityEffect = (abilityKey, game) => {
    const ability = abilities[abilityKey];
    if (ability && ability.effect) {
        ability.effect(game);
    }
};

// アビリティの有効性をチェック
export const isAbilityActive = (abilityKey) => {
    return abilityStates[abilityKey]?.active || false;
};

// アビリティの購入状態をチェック
export const isAbilityPurchased = (abilityKey, currentAbilities) => {
    return currentAbilities[abilityKey]?.purchased || false;
};

// アビリティのコスト範囲を取得
export const getAbilityCostRange = () => {
    const costs = Object.values(abilities).map(ability => ability.cost);
    return {
        min: Math.min(...costs),
        max: Math.max(...costs)
    };
};

// 特定のレアリティのアビリティを取得
export const getAbilitiesByRarity = (rarity) => {
    return Object.values(abilities)
        .filter(ability => ability.rarity === rarity);
};

// アビリティの効果をリセット
export const resetAbilityStates = () => {
    Object.keys(abilityStates).forEach(key => {
        abilityStates[key].active = false;
    });
}; 