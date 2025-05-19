class FastFoodWorker {
    constructor() {
        this.health = 100;
        this.level = 1;
        this.score = 0;
        this.coins = 0;
        this.currentWord = '';
        this.isInShop = false;
        this.isPreparing = false;
        this.shopItems = [];
        this.maxRerolls = 3;
        this.currentRerolls = 0;
        this.showingLevelUpMessage = false;
        this.scoreMultiplier = 1;
        this.autoDestroyer = false;
        this.autoDestroyerTime = 0;
        this.specialEnemy = false;
        this.unlockedWords = {
            easy: [],
            medium: [],
            hard: []
        };
        this.purchasedItems = new Set();
        this.words = {
            easy: [
                { kana: 'コーラ', hira: 'こーら' },
                { kana: 'サラダ', hira: 'さらだ' },
                { kana: 'シェイク', hira: 'しぇいく' },
                { kana: 'ポテト', hira: 'ぽてと' },
                { kana: 'ナゲット', hira: 'なげっと' },
                { kana: 'アイス', hira: 'あいす' },
                { kana: 'パイ', hira: 'ぱい' },
                { kana: 'パン', hira: 'ぱん' },
                { kana: 'スープ', hira: 'すーぷ' },
                { kana: 'ジュース', hira: 'じゅーす' },
                { kana: 'コーヒー', hira: 'こーひー' },
                { kana: '紅茶', hira: 'こうちゃ' },
                { kana: 'チーズ', hira: 'ちーず' },
                { kana: 'トマト', hira: 'とまと' },
                { kana: 'レタス', hira: 'れたす' }
            ],
            medium: [
                { kana: 'ハンバーガー', hira: 'はんばーがー' },
                { kana: 'フライドポテト', hira: 'ふらいどぽてと' },
                { kana: 'チキンナゲット', hira: 'ちきんなげっと' },
                { kana: 'アイスクリーム', hira: 'あいすくりーむ' }
            ],
            hard: [
                { kana: 'チーズバーガー', hira: 'ちーずばーがー' },
                { kana: 'フィッシュバーガー', hira: 'ふぃっしゅばーがー' },
                { kana: 'チキンバーガー', hira: 'ちきんばーがー' },
                { kana: 'ダブルチーズバーガー', hira: 'だぶるちーずばーがー' },
                { kana: 'ビッグマック', hira: 'びっぐまっく' }
            ]
        };
        this.levelGoals = {
            1: 100,
            2: 300,
            3: 600,
            4: 1000,
            5: 1500
        };
        this.enemies = [];
        this.inputTimeout = null;
        this.tempInput = null;
        this.enterKeyPressed = false;
        this.enterKeyTimer = null;
        this.levelUpMessage = null;
        this.init();
    }

    init() {
        this.inputField = document.getElementById('input-field');
        this.currentWordElement = document.getElementById('current-word');
        this.enemyArea = document.getElementById('enemy-area');
        
        // 一時的な入力欄を作成
        this.tempInput = document.createElement('input');
        this.tempInput.type = 'text';
        this.tempInput.style.position = 'absolute';
        this.tempInput.style.left = '-9999px';
        document.body.appendChild(this.tempInput);
        
                
        // レベルアップメッセージ用の要素を作成
        this.levelUpMessage = document.createElement('div');
        this.levelUpMessage.className = 'level-up-message';
        document.body.appendChild(this.levelUpMessage);


        this.setupEventListeners();
        this.spawnEnemy();
        this.updateStatus();
    }

    setupEventListeners() {
        this.inputField.addEventListener('input', () => {
            // 既存のタイムアウトをクリア
            if (this.inputTimeout) {
                clearTimeout(this.inputTimeout);
            }
            
            // 新しいタイムアウトを設定
            this.inputTimeout = setTimeout(() => {
                this.checkInput();
            }, 500);
        });

        // Enterキーの長押し検出
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.enterKeyPressed) {
                this.enterKeyPressed = true;
                this.enterKeyTimer = setTimeout(() => {
                    this.handleEnterLongPress();
                }, 1000); // 1秒間の長押し
            }

            // デバッグ用：F8キーでレベルクリア
            if (e.key === 'F8' && !this.isInShop) {
                this.score = this.levelGoals[this.level];
                this.checkLevelProgress();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.enterKeyPressed = false;
                if (this.enterKeyTimer) {
                    clearTimeout(this.enterKeyTimer);
                }
            }
        });
    }

    checkInput() {
        if (this.isPreparing) return;
        
        const input = this.inputField.value;
        const matchingEnemy = this.enemies.find(enemy => 
            enemy.word.kana === input || enemy.word.hira === input
        );
        
        if (matchingEnemy) {
            this.score += this.getScoreForWord(matchingEnemy.difficulty);
            this.enemies = this.enemies.filter(e => e !== matchingEnemy);
            this.clearInput();
            this.updateStatus();
            this.checkLevelProgress();
            
            if (this.level === 1 && this.enemies.length === 0) {
                this.spawnEnemy();
            }
        }
    }

    clearInput() {
        // 一時的な入力欄にフォーカスを移してIMEを確定
        this.tempInput.focus();
        // 元の入力欄をクリア
        this.inputField.value = '';
        // 元の入力欄にフォーカスを戻す
        this.inputField.focus();
        
        // タイムアウトをクリア
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
    }

    getRandomWord() {
        if (this.level === 1) {
            const word = this.words.easy[Math.floor(Math.random() * this.words.easy.length)];
            return {
                word: word,
                difficulty: 'easy'
            };
        }

        const difficulty = Math.random();
        let wordList;
        
        if (this.level === 2) {
            // レベル2では中級と上級のみ
            if (difficulty < 0.6) {
                wordList = this.words.medium;
            } else {
                wordList = this.words.hard;
            }
        } else {
            if (difficulty < 0.4) {
                wordList = this.words.easy;
            } else if (difficulty < 0.8) {
                wordList = this.words.medium;
            } else {
                wordList = this.words.hard;
            }
        }
        
        // アンロックされた単語がある場合は、それらも含める
        const unlockedWords = this.unlockedWords[this.level === 2 ? 
            (difficulty < 0.6 ? 'medium' : 'hard') :
            (difficulty < 0.4 ? 'easy' : difficulty < 0.8 ? 'medium' : 'hard')];
        
        if (unlockedWords.length > 0) {
            wordList = [...wordList, ...unlockedWords];
        }
        
        return {
            word: wordList[Math.floor(Math.random() * wordList.length)],
            difficulty: this.level === 2 ? 
                (difficulty < 0.6 ? 'medium' : 'hard') :
                (difficulty < 0.4 ? 'easy' : difficulty < 0.8 ? 'medium' : 'hard')
        };
    }

    getTimeLimitForLevel() {
        // レベルに応じて基本時間を設定（秒）
        const baseTime = 20;
        // レベルが上がるごとに5秒ずつ減少、最小10秒
        const timeLimit = Math.max(10, baseTime - (this.level - 1) * 5);
        return timeLimit * 1000; // ミリ秒に変換
    }

    getScoreForWord(difficulty) {
        switch(difficulty) {
            case 'easy': return 10 * this.scoreMultiplier;
            case 'medium': return 20 * this.scoreMultiplier;
            case 'hard': return 30 * this.scoreMultiplier;
            case 'special': return 100 * this.scoreMultiplier;
            default: return 10 * this.scoreMultiplier;
        }
    }

    getSpeedForLevel() {
        if (this.level === 2) {
            return 0.5 + Math.random(); // レベル2では遅めの速度
        }
        return 1 + Math.random() * 2; // 通常の速度
    }

    spawnEnemy() {
        const wordData = this.getRandomWord();
        const enemy = {
            word: wordData.word,
            difficulty: wordData.difficulty,
            x: this.enemyArea.clientWidth,
            y: Math.random() * (this.enemyArea.clientHeight - 50),
            speed: this.getSpeedForLevel(),
            timeLimit: this.getTimeLimitForLevel(),
            spawnTime: Date.now()
        };
        this.enemies.push(enemy);
        this.updateEnemyDisplay();
    }

    updateEnemyDisplay() {
        this.enemyArea.innerHTML = '';
        this.enemies.forEach(enemy => {
            const enemyElement = document.createElement('div');
            enemyElement.className = `enemy ${enemy.difficulty}`;
            enemyElement.textContent = enemy.word.kana;
            enemyElement.style.left = `${enemy.x}px`;
            enemyElement.style.top = `${enemy.y}px`;
            
            const timeLeft = Math.max(0, (enemy.timeLimit - (Date.now() - enemy.spawnTime)) / 1000);
            const timeElement = document.createElement('div');
            timeElement.className = 'time-left';
            timeElement.textContent = `${timeLeft.toFixed(1)}秒`;
            enemyElement.appendChild(timeElement);
            
            this.enemyArea.appendChild(enemyElement);
        });
    }

    handleEnterLongPress() {
        if (this.isInShop) {
            const nextLevel = this.level + 1;
            if (this.levelGoals[nextLevel]) {
                this.level = nextLevel;
                this.exitShop();
            } else {
                if (confirm(`おめでとう！ゲームクリア！\n最終スコア: ${this.score}\nもう一度プレイしますか？`)) {
                    this.reset();
                }
            }
            return;
        }

        const currentGoal = this.levelGoals[this.level];
        if (this.score >= currentGoal) {
            this.enterShop();
        }
    }

    enterShop() {
        this.isInShop = true;
        // F8で獲得したコインを保持するため、スコアをコインに加算
        this.coins += this.score;
        this.score = 0;
        this.generateShopItems();
        this.updateShopDisplay();
        this.updateStatus();
        this.levelUpMessage.classList.remove('show', 'minimized');
    }

    exitShop() {
        this.isInShop = false;
        this.isPreparing = true;
        this.currentRerolls = 0;
        this.updateStatus();
        
        // ゲーム画面を再構築
        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = `
            <div id="typing-area">
                <div id="current-word"></div>
                <input type="text" id="input-field" autocomplete="off" disabled>
            </div>
            <div id="enemy-area"></div>
        `;
        
        // 要素の参照を更新
        this.inputField = document.getElementById('input-field');
        this.currentWordElement = document.getElementById('current-word');
        this.enemyArea = document.getElementById('enemy-area');
        
        // イベントリスナーを再設定
        this.setupEventListeners();
        
        // 敵を生成して表示
        this.spawnEnemy();
        this.updateEnemyDisplay();
        
        // 2秒後にゲームを再開
        setTimeout(() => {
            this.isPreparing = false;
            this.inputField.disabled = false;
            this.inputField.focus();
            this.gameLoop();
        }, 2000);
    }

    generateShopItems() {
        const baseItems = [
            {
                name: '体力回復',
                description: 'HPを30回復',
                cost: 50,
                effect: () => { this.health = Math.min(100, this.health + 30); }
            },
            {
                name: 'タイム延長',
                description: '敵の制限時間を5秒延長',
                cost: 100,
                effect: () => { this.enemies.forEach(e => e.timeLimit += 5000); }
            },
            {
                name: 'スコア倍率',
                description: 'スコア獲得量が1.5倍',
                cost: 150,
                effect: () => { this.scoreMultiplier += 1.5; }
            }
        ];

        const specialItems = [
            {
                name: '自動破壊装置',
                description: '10秒間、敵を自動で倒す',
                cost: 200,
                effect: () => {
                    this.autoDestroyer = true;
                    this.autoDestroyerTime = Date.now() + 10000;
                }
            },
            {
                name: '特殊敵出現',
                description: '高得点の特殊敵が出現',
                cost: 250,
                effect: () => {
                    this.specialEnemy = true;
                    this.spawnSpecialEnemy();
                }
            },
            {
                name: '無敵時間',
                description: '5秒間ダメージを受けない',
                cost: 300,
                effect: () => {
                    this.isInvincible = true;
                    setTimeout(() => {
                        this.isInvincible = false;
                    }, 5000);
                }
            }
        ];

        const wordItems = [
            {
                name: '新メニュー：チーズケーキ',
                description: '高得点の新メニューを追加',
                cost: 150,
                effect: () => {
                    const newWord = { kana: 'チーズケーキ', hira: 'ちーずけーき' };
                    this.unlockedWords.medium.push(newWord);
                    this.words.medium.push(newWord);
                }
            },
            {
                name: '新メニュー：シェイク',
                description: '高得点の新メニューを追加',
                cost: 150,
                effect: () => {
                    const newWord = { kana: 'シェイク', hira: 'しぇいく' };
                    this.unlockedWords.medium.push(newWord);
                    this.words.medium.push(newWord);
                }
            },
            {
                name: '新メニュー：フライドチキン',
                description: '高得点の新メニューを追加',
                cost: 200,
                effect: () => {
                    const newWord = { kana: 'フライドチキン', hira: 'ふらいどちきん' };
                    this.unlockedWords.hard.push(newWord);
                    this.words.hard.push(newWord);
                }
            },
            {
                name: '新メニュー：ビッグバーガー',
                description: '高得点の新メニューを追加',
                cost: 200,
                effect: () => {
                    const newWord = { kana: 'ビッグバーガー', hira: 'びっぐばーがー' };
                    this.unlockedWords.hard.push(newWord);
                    this.words.hard.push(newWord);
                }
            }
        ];

        // アイテムの出現確率を設定
        const weightedItems = [
            ...baseItems.map(item => ({ item, weight: 2 })), // 基本アイテムは2倍の重み
            ...specialItems.map(item => ({ item, weight: 1 })), // 特殊アイテムは1倍の重み
            ...wordItems.map(item => ({ item, weight: 3 })) // 単語アイテムは3倍の重み
        ];

        // 重み付けされたアイテムから5つを選択
        const selectedItems = [];
        const totalWeight = weightedItems.reduce((sum, { weight }) => sum + weight, 0);

        while (selectedItems.length < 5) {
            let random = Math.random() * totalWeight;
            for (const { item, weight } of weightedItems) {
                random -= weight;
                if (random <= 0) {
                    selectedItems.push(item);
                    break;
                }
            }
        }

        this.shopItems = selectedItems;
    }

    spawnSpecialEnemy() {
        const specialWords = [
            { kana: 'トリプルバーガー', hira: 'とりぷるばーがー' },
            { kana: 'メガフライドポテト', hira: 'めがふらいどぽてと' },
            { kana: 'スーパーシェイク', hira: 'すーぱーしぇいく' }
        ];
        const word = specialWords[Math.floor(Math.random() * specialWords.length)];
        const enemy = {
            word: word,
            difficulty: 'special',
            x: this.enemyArea.clientWidth,
            y: Math.random() * (this.enemyArea.clientHeight - 50),
            speed: 0.3, // 特殊敵は遅め
            timeLimit: 30000, // 30秒
            spawnTime: Date.now()
        };
        this.enemies.push(enemy);
        this.updateEnemyDisplay();
    }

    rerollShopItems() {
        if (this.currentRerolls < this.maxRerolls) {
            this.currentRerolls++;
            this.purchasedItems.clear();
            this.generateShopItems();
            this.updateShopDisplay();
        }
    }

    purchaseItem(index) {
        const item = this.shopItems[index];
        if (this.coins >= item.cost && !this.purchasedItems.has(item.name)) {
            this.coins -= item.cost;
            item.effect();
            this.purchasedItems.add(item.name);
            this.updateStatus();
            this.updateShopDisplay();
        }
    }

    updateShopDisplay() {
        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = `
            <div class="shop-container">
                <h2>ショップ</h2>
                <div class="coins-display">コイン: ${this.coins}</div>
                <div class="reroll-info">再抽選残り: ${this.maxRerolls - this.currentRerolls}回</div>
                <div class="shop-items">
                    ${this.shopItems.map((item, index) => `
                        <div class="shop-item">
                            <h3>${item.name}</h3>
                            <p>${item.description}</p>
                            <p>価格: ${item.cost}コイン</p>
                            <button onclick="game.purchaseItem(${index})" 
                                ${this.coins < item.cost || this.purchasedItems.has(item.name) ? 'disabled' : ''}>
                                ${this.purchasedItems.has(item.name) ? '購入済み' : '購入'}
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="game.rerollShopItems()" ${this.currentRerolls >= this.maxRerolls ? 'disabled' : ''}>
                    再抽選
                </button>
                <p class="shop-instruction">Enterキーを長押しして次のレベルへ</p>
            </div>
        `;
    }

    checkLevelProgress() {
        const currentGoal = this.levelGoals[this.level];
        if (this.score >= currentGoal && !this.isInShop) {
            this.levelUpMessage.textContent = `レベル${this.level}クリア！\nスコア: ${this.score}\nEnterキーを長押しして次のレベルへ`;
            this.levelUpMessage.classList.add('show');
            
            // 2秒後にミニマイズ
            setTimeout(() => {
                this.levelUpMessage.classList.add('minimized');
            }, 2000);

            // enterキーを長押ししてshop
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.enterKeyPressed) {
                    this.enterKeyPressed = true;
                    this.enterKeyTimer = setTimeout(() => {
                        this.enterShop();
                    }, 1000);
                }
            });
        }

    }

    updateStatus() {
        document.getElementById('health').textContent = `HP: ${this.health}`;
        document.getElementById('level').textContent = `Level: ${this.level} (目標: ${this.levelGoals[this.level]})`;
        document.getElementById('score').textContent = this.isInShop ? 
            `コイン: ${this.coins}` : 
            `Score: ${this.score}`;
    }

    gameLoop() {
        if (this.isInShop || this.isPreparing) {
            return;
        }

        const currentTime = Date.now();
        
        // 自動破壊装置の処理
        if (this.autoDestroyer && currentTime < this.autoDestroyerTime) {
            this.enemies.forEach(enemy => {
                this.score += this.getScoreForWord(enemy.difficulty);
            });
            this.enemies = [];
            this.updateStatus();
        } else if (this.autoDestroyer && currentTime >= this.autoDestroyerTime) {
            this.autoDestroyer = false;
        }

        this.enemies.forEach(enemy => {
            enemy.x -= enemy.speed;
            
            if (!enemy.spawnTime) {
                enemy.spawnTime = currentTime;
            }
            
            if (currentTime - enemy.spawnTime > enemy.timeLimit) {
                if (!this.isInvincible) {
                    this.health -= 3;
                }
                this.enemies = this.enemies.filter(e => e !== enemy);
                this.updateStatus();
                
                if (this.level === 1 && this.enemies.length === 0) {
                    this.spawnEnemy();
                }
            }

            if (enemy.x < -100) {
                enemy.x = this.enemyArea.clientWidth;
                enemy.y = Math.random() * (this.enemyArea.clientHeight - 50);
                enemy.speed = this.getSpeedForLevel();
            }
        });

        // レベル2では最大2体まで
        if (this.level === 2 && this.enemies.length < 2) {
            this.spawnEnemy();
        } else if (this.level !== 1 && this.level !== 2 && this.enemies.length < 3) {
            this.spawnEnemy();
        }

        this.updateEnemyDisplay();

        if (this.health <= 0) {
            alert(`ゲームオーバー！\nレベル: ${this.level}\nスコア: ${this.score}`);
            this.reset();
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    reset() {
        this.health = 100;
        this.level = 1;
        this.score = 0;
        this.enemies = [];
        this.updateStatus();
        this.levelUpMessage.classList.remove('show', 'minimized');
        this.gameLoop();
    }

    start() {
        this.gameLoop();
    }
}

// ゲーム開始
const game = new FastFoodWorker();
game.start();