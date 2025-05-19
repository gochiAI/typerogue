// スコア計算関連
export const calculateScore = (difficulty, scoreMultiplier) => {
    const baseScores = {
        easy: 10,
        medium: 20,
        hard: 30,
        special: 100
    };
    return (baseScores[difficulty] || 10) * scoreMultiplier;
};

// 時間管理関連
export const updateGameTime = (hour) => {
    const newHour = hour + 0.1;
    return {
        hour: newHour >= 24 ? 0 : newHour,
        isLunchTime: newHour >= 11 && newHour <= 14
    };
};

// 敵の生成関連
export const generateEnemy = (level, enemyArea, words, unlockedWords, isLunchTime) => {
    const wordData = getRandomWord(level, words, unlockedWords);
    return {
        word: wordData.word,
        difficulty: wordData.difficulty,
        x: enemyArea.clientWidth,
        y: Math.random() * (enemyArea.clientHeight - 50),
        speed: getSpeedForLevel(level, isLunchTime),
        timeLimit: getTimeLimitForLevel(level, isLunchTime),
        spawnTime: Date.now(),
        isTroubleCustomer: Math.random() < 0.1
    };
};

// 単語選択関連
const getRandomWord = (level, words, unlockedWords) => {
    if (level === 1) {
        const word = words.easy[Math.floor(Math.random() * words.easy.length)];
        return {
            word: word,
            difficulty: 'easy'
        };
    }

    const difficulty = Math.random();
    let wordList;
    
    if (level === 2) {
        // レベル2では中級と上級のみ
        if (difficulty < 0.6) {
            wordList = words.medium;
        } else {
            wordList = words.hard;
        }
    } else {
        if (difficulty < 0.4) {
            wordList = words.easy;
        } else if (difficulty < 0.8) {
            wordList = words.medium;
        } else {
            wordList = words.hard;
        }
    }
    
    // アンロックされた単語がある場合は、それらも含める
    const difficultyKey = level === 2 ? 
        (difficulty < 0.6 ? 'medium' : 'hard') :
        (difficulty < 0.4 ? 'easy' : difficulty < 0.8 ? 'medium' : 'hard');
    
    const unlockedWordsForDifficulty = unlockedWords[difficultyKey];
    if (unlockedWordsForDifficulty.length > 0) {
        wordList = [...wordList, ...unlockedWordsForDifficulty];
    }
    
    return {
        word: wordList[Math.floor(Math.random() * wordList.length)],
        difficulty: difficultyKey
    };
};

// 速度計算
const getSpeedForLevel = (level, isLunchTime) => {
    let speed;
    if (level === 2) {
        speed = 0.5 + Math.random(); // レベル2では遅めの速度
    } else {
        speed = 1 + Math.random() * 2; // 通常の速度
    }
    
    // お昼時は速度を上げる
    if (isLunchTime) {
        speed *= 1.3;
    }
    
    return speed;
};

// 時間制限計算
const getTimeLimitForLevel = (level, isLunchTime) => {
    // レベルに応じて基本時間を設定（秒）
    const baseTime = 20;
    // レベルが上がるごとに5秒ずつ減少、最小10秒
    let timeLimit = Math.max(10, baseTime - (level - 1) * 5);
    
    // お昼時は時間を短く
    if (isLunchTime) {
        timeLimit *= 0.7;
    }
    
    return timeLimit * 1000; // ミリ秒に変換
}; 