import { items, isItemActive, resetItemStates, itemEffects } from './data/items.js';
import { createInitialAbilities, getShopAbilities, abilityStates } from './data/abilities.js';
import { words } from './data/words.js';
import { calculateScore, updateGameTime, generateEnemy } from './data/gameLogic.js';

class FastFoodWorker {
    constructor() {
        this.initializeGameState();
        this.initializeGameElements();
        this.initializeEventListeners();
        this.init();
    }

    // ゲーム状態の初期化
    initializeGameState() {
        this.state = {
            // 基本ステータス
            health: 100,
            level: 1,
            score: 0,
            coins: 0,

            // ゲーム状態
            isInShop: false,
            isPreparing: false,
            showingLevelUpMessage: false,
            enterKeyPressed: false,

            // 時間管理
            day: 1,
            hour: 9,
            isLunchTime: false,

            // 敵の設定
            enemies: [],
            troubleCustomerChance: 0.1,

            // ショップ関連
            shopItems: [],
            maxRerolls: 3,
            currentRerolls: 0,

            // アビリティとアイテム
            abilities: createInitialAbilities(),
            inventory: [],
            scoreMultiplier: 1,

            // 単語管理
            unlockedWords: {
                easy: [],
                medium: [],
                hard: []
            }
        };

        // レベル目標
        this.levelGoals = {
            1: 100,
            2: 300,
            3: 600,
            4: 1000,
            5: 1500
        };
    }

    // DOM要素の初期化
    initializeGameElements() {
        this.elements = {
            inputField: null,
            currentWordElement: null,
            enemyArea: null,
            tempInput: null,
            levelUpMessage: null,
            inputTimeout: null,
            virtualKeyboard: null
        };
    }

    // 仮想キーボードの初期化
    initializeVirtualKeyboard() {
        if (!this.isMobileDevice()) return;

        const keyboard = document.createElement('div');
        keyboard.className = 'virtual-keyboard';
        
        // キーボードのレイアウト
        const layout = [
            ['あ', 'い', 'う', 'え', 'お'],
            ['か', 'き', 'く', 'け', 'こ'],
            ['さ', 'し', 'す', 'せ', 'そ'],
            ['た', 'ち', 'つ', 'て', 'と'],
            ['な', 'に', 'ぬ', 'ね', 'の'],
            ['は', 'ひ', 'ふ', 'へ', 'ほ'],
            ['ま', 'み', 'む', 'め', 'も'],
            ['や', 'ゆ', 'よ', 'わ', 'を'],
            ['ん', 'ー', '←', 'Enter', 'Clear']
        ];

        // キーボードの作成
        layout.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyElement = document.createElement('button');
                keyElement.className = 'keyboard-key';
                keyElement.textContent = key;
                
                // キーのイベントハンドラ
                keyElement.addEventListener('click', () => {
                    if (key === '←') {
                        this.elements.inputField.value = this.elements.inputField.value.slice(0, -1);
                    } else if (key === 'Clear') {
                        this.elements.inputField.value = '';
                    } else if (key === 'Enter') {
                        this.handleEnterLongPress();
                    } else {
                        this.elements.inputField.value += key;
                    }
                    this.handleInput(this.elements.inputField.value);
                });
                
                rowElement.appendChild(keyElement);
            });
            
            keyboard.appendChild(rowElement);
        });

        // キーボードの位置調整用のハンドルを追加
        const handle = document.createElement('div');
        handle.className = 'keyboard-handle';
        keyboard.appendChild(handle);

        // ドラッグ&ドロップの実装
        let isDragging = false;
        let startY;
        let startTop;

        handle.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            startTop = keyboard.classList.contains('top-position') ? 0 : window.innerHeight - keyboard.offsetHeight;
        });

        handle.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const deltaY = e.touches[0].clientY - startY;
            const threshold = window.innerHeight / 2;

            if (keyboard.classList.contains('top-position')) {
                if (deltaY > threshold) {
                    keyboard.classList.remove('top-position');
                }
            } else {
                if (deltaY < -threshold) {
                    keyboard.classList.add('top-position');
                }
            }
        });

        handle.addEventListener('touchend', () => {
            isDragging = false;
        });

        this.elements.virtualKeyboard = keyboard;
        document.body.appendChild(keyboard);
    }

    // イベントリスナーの初期化
    initializeEventListeners() {
        this.eventHandlers = {
            input: this.handleInput.bind(this),
            keydown: this.handleKeyDown.bind(this),
            keyup: this.handleKeyUp.bind(this)
        };
    }

    // イベントリスナーの設定
    setupEventListeners() {
        if (!this.isMobileDevice()) {
            this.elements.inputField.addEventListener('input', this.eventHandlers.input);
            document.addEventListener('keydown', this.eventHandlers.keydown);
            document.addEventListener('keyup', this.eventHandlers.keyup);
        }
    }

    // キーダウンイベントの処理
    handleKeyDown(e) {
        if (e.key === 'Enter' && !this.state.enterKeyPressed) {
            this.state.enterKeyPressed = true;
            this.state.enterKeyTimer = setTimeout(() => {
                this.handleEnterLongPress();
            }, 1000);
        }

        // デバッグ用：F8キーでレベルクリア
        if (e.key === 'F8' && !this.state.isInShop) {
            this.state.score = this.levelGoals[this.state.level];
            this.checkLevelProgress();
        }
    }

    // キーアップイベントの処理
    handleKeyUp(e) {
        if (e.key === 'Enter') {
            this.state.enterKeyPressed = false;
            if (this.state.enterKeyTimer) {
                clearTimeout(this.state.enterKeyTimer);
            }
        }
    }

    // スコア計算
    getScoreForWord(difficulty) {
        try {
            let score = calculateScore(difficulty, this.state.scoreMultiplier);
            return this.applyScoreMultipliers(score);
        } catch (error) {
            console.error('スコア計算エラー:', error);
            return 0;
        }
    }

    // スコア倍率の適用
    applyScoreMultipliers(baseScore) {
        let finalScore = baseScore;

        if (abilityStates.doubleOrder.active && Math.random() < abilityStates.doubleOrder.chance) {
            finalScore *= abilityStates.doubleOrder.multiplier;
        }

        return finalScore;
    }

    // 時間管理
    updateGameTime() {
        try {
            const { hour, isLunchTime } = updateGameTime(this.state.hour);
            this.state.hour = hour;
            this.state.isLunchTime = isLunchTime;
        } catch (error) {
            console.error('時間更新エラー:', error);
        }
    }

    // 敵の生成
    spawnEnemy() {
        try {
            this.state.troubleCustomerChance = itemEffects.getTroubleCustomerChance();
            const enemy = generateEnemy(
                this.state.level,
                this.elements.enemyArea,
                words,
                this.state.unlockedWords,
                this.state.isLunchTime
            );
            this.applyEnemyModifiers(enemy);
            this.state.enemies.push(enemy);
            this.updateEnemyDisplay();
        } catch (error) {
            console.error('敵生成エラー:', error);
        }
    }

    // 敵の修正適用
    applyEnemyModifiers(enemy) {
        if (abilityStates.lunchMaster.active && this.state.isLunchTime) {
            enemy.speed *= abilityStates.lunchMaster.speedMultiplier;
            enemy.timeLimit *= abilityStates.lunchMaster.timeMultiplier;
        }
    }

    // 入力処理
    handleInput(input) {
        if (this.state.isPreparing) return;

        try {
            if (itemEffects.handleSuperFinger(this)) return;
            this.processNormalInput(input);
        } catch (error) {
            console.error('入力処理エラー:', error);
        }
    }

    // 通常入力の処理
    processNormalInput(input) {
        const matchingEnemy = this.findMatchingEnemy(input);
        if (matchingEnemy) {
            this.processSuccessfulInput(matchingEnemy);
        }
    }

    // マッチする敵の検索
    findMatchingEnemy(input) {
        return this.state.enemies.find(enemy => {
            if (abilityStates.quickHand.active) {
                return this.isPartialMatch(input, enemy);
            }
            return this.isExactMatch(input, enemy);
        });
    }

    // 部分一致の確認
    isPartialMatch(input, enemy) {
        return enemy.word.kana.includes(input) || 
               enemy.word.hira.includes(input) ||
               input.includes(enemy.word.kana) ||
               input.includes(enemy.word.hira);
    }

    // 完全一致の確認
    isExactMatch(input, enemy) {
        return enemy.word.kana === input || enemy.word.hira === input;
    }

    // 成功時の処理
    processSuccessfulInput(enemy) {
        try {
            const score = this.getScoreForWord(enemy.difficulty);
            this.updateScoreAndCoins(score);
            this.removeEnemy(enemy);
            this.clearInput();
            this.updateStatus();
            this.checkLevelProgress();
            this.handleLevelOneEnemy();
        } catch (error) {
            console.error('成功処理エラー:', error);
        }
    }

    // スコアとコインの更新
    updateScoreAndCoins(score) {
        this.state.score += score;
        const bonus = itemEffects.calculateCoinBonus(score);
        if (bonus > 0) {
            this.state.coins += bonus;
        }
    }

    // 敵の削除
    removeEnemy(enemy) {
        this.state.enemies = this.state.enemies.filter(e => e !== enemy);
    }

    // レベル1の敵処理
    handleLevelOneEnemy() {
        if (this.state.level === 1 && this.state.enemies.length === 0) {
            this.spawnEnemy();
        }
    }

    // アイテムの使用
    useItem(itemName) {
        try {
            const itemIndex = this.state.inventory.findIndex(item => item.name === itemName);
            if (itemIndex === -1 || !isItemActive(itemName)) return false;

            const item = this.state.inventory[itemIndex];
            item.effect(this);
            this.removeFromInventory(itemName);
            return true;
        } catch (error) {
            console.error('アイテム使用エラー:', error);
            return false;
        }
    }

    // アビリティの使用
    useAbility(abilityKey) {
        try {
            const ability = this.state.abilities[abilityKey];
            if (!ability || !ability.active) return false;

            ability.effect(this);
            return true;
        } catch (error) {
            console.error('アビリティ使用エラー:', error);
            return false;
        }
    }

    // ショップ関連
    generateShopItems() {
        this.state.shopItems = [];
        const rarityLevel = Math.min(Math.floor(this.state.day / 3), 3);

        // アビリティの追加
        this.state.shopItems.push(...getShopAbilities(this.state.abilities));

        // アイテムの追加
        const allItems = [
            ...items.base,
            ...items.special,
            ...items.menu
        ];

        // レアリティに応じた商品を追加（未購入のもののみ）
        allItems.forEach(item => {
            // インベントリに同じアイテムがない場合のみ追加
            if (this.getRarityLevel(item.rarity) <= rarityLevel &&
                !this.state.inventory.some(invItem => invItem.name === item.name)) {
                this.state.shopItems.push({
                    type: 'item',
                    ...item
                });
            }
        });
    }

    init() {
        this.loadGameState();
        this.elements.inputField = document.getElementById('input-field');
        this.elements.currentWordElement = document.getElementById('current-word');
        this.elements.enemyArea = document.getElementById('enemy-area');
        
        // 一時的な入力欄を作成
        this.elements.tempInput = document.createElement('input');
        this.elements.tempInput.type = 'text';
        this.elements.tempInput.style.position = 'absolute';
        this.elements.tempInput.style.left = '-9999px';
        document.body.appendChild(this.elements.tempInput);
                
        // レベルアップメッセージ用の要素を作成
        this.elements.levelUpMessage = document.createElement('div');
        this.elements.levelUpMessage.className = 'level-up-message';
        document.body.appendChild(this.elements.levelUpMessage);

        // 仮想キーボードの初期化
        this.initializeVirtualKeyboard();

        this.setupEventListeners();
        this.spawnEnemy();
        this.updateStatus();
    }

    checkInput() {
        if (this.state.isPreparing) return;

        const input = this.elements.inputField.value;
        const matchingEnemy = this.state.enemies.find(enemy =>
            enemy.word.kana === input || enemy.word.hira === input
        );

        if (matchingEnemy) {
            this.state.score += this.getScoreForWord(matchingEnemy.difficulty);
            this.state.enemies = this.state.enemies.filter(e => e !== matchingEnemy);
            this.clearInput();
            this.updateStatus();
            this.checkLevelProgress();

            if (this.state.level === 1 && this.state.enemies.length === 0) {
                this.spawnEnemy();
            }
        }
    }

    clearInput() {
        // 一時的な入力欄にフォーカスを移してIMEを確定
        this.elements.tempInput.focus();
        // 元の入力欄をクリア
        this.elements.inputField.value = '';
        // 元の入力欄にフォーカスを戻す
        this.elements.inputField.focus();

        // タイムアウトをクリア
        if (this.elements.inputTimeout) {
            clearTimeout(this.elements.inputTimeout);
        }
    }

    getRandomWord() {
        if (this.state.level === 1) {
            const word = words.easy[Math.floor(Math.random() * words.easy.length)];
            return {
                word: word,
                difficulty: 'easy'
            };
        }

        const difficulty = Math.random();
        let wordList;

        if (this.state.level === 2) {
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
        const unlockedWords = this.state.unlockedWords[this.state.level === 2 ?
            (difficulty < 0.6 ? 'medium' : 'hard') :
            (difficulty < 0.4 ? 'easy' : difficulty < 0.8 ? 'medium' : 'hard')];

        if (unlockedWords.length > 0) {
            wordList = [...wordList, ...unlockedWords];
        }

        return {
            word: wordList[Math.floor(Math.random() * wordList.length)],
            difficulty: this.state.level === 2 ?
                (difficulty < 0.6 ? 'medium' : 'hard') :
                (difficulty < 0.4 ? 'easy' : difficulty < 0.8 ? 'medium' : 'hard')
        };
    }

    getTimeLimitForLevel() {
        // レベルに応じて基本時間を設定（秒）
        const baseTime = 20;
        // レベルが上がるごとに5秒ずつ減少、最小10秒
        let timeLimit = Math.max(10, baseTime - (this.state.level - 1) * 5);

        // お昼時は時間を短く
        if (this.state.isLunchTime) {
            timeLimit *= 0.7;
        }

        return timeLimit * 1000; // ミリ秒に変換
    }

    getSpeedForLevel() {
        let speed;
        if (this.state.level === 2) {
            speed = 0.5 + Math.random(); // レベル2では遅めの速度
        } else {
            speed = 1 + Math.random() * 2; // 通常の速度
        }

        // お昼時は速度を上げる
        if (this.state.isLunchTime) {
            speed *= 1.3;
        }

        return speed;
    }

    updateEnemyDisplay() {
        this.elements.enemyArea.innerHTML = '';
        this.state.enemies.forEach(enemy => {
            const enemyElement = document.createElement('div');
            enemyElement.className = `enemy ${enemy.difficulty} ${enemy.isTroubleCustomer ? 'trouble' : ''}`;
            enemyElement.textContent = enemy.word.kana;
            enemyElement.style.left = `${enemy.x}px`;
            enemyElement.style.top = `${enemy.y}px`;

            const timeLeft = Math.max(0, (enemy.timeLimit - (Date.now() - enemy.spawnTime)) / 1000);
            const timeElement = document.createElement('div');
            timeElement.className = 'time-left';
            timeElement.textContent = `${timeLeft.toFixed(1)}秒`;
            enemyElement.appendChild(timeElement);

            if (enemy.isTroubleCustomer) {
                const troubleIcon = document.createElement('div');
                troubleIcon.className = 'trouble-icon';
                troubleIcon.textContent = '⚠️';
                enemyElement.appendChild(troubleIcon);
            }

            this.elements.enemyArea.appendChild(enemyElement);
        });
    }

    handleEnterLongPress() {
        if (this.state.isInShop) {
            const nextLevel = this.state.level + 1;
            if (this.levelGoals[nextLevel]) {
                this.state.level = nextLevel;
                this.exitShop();
            } else {
                if (confirm(`おめでとう！ゲームクリア！\n最終スコア: ${this.state.score}\nもう一度プレイしますか？`)) {
                    this.reset();
                }
            }
            return;
        }

        const currentGoal = this.levelGoals[this.state.level];
        if (this.state.score >= currentGoal) {
            this.enterShop();
        }
    }

    enterShop() {
        this.state.isInShop = true;
        this.state.day++;
        // F8で獲得したコインを保持するため、スコアをコインに加算
        this.state.coins += this.state.score;
        this.state.score = 0;
        this.generateShopItems();
        this.updateShopDisplay();
        this.updateStatus();
        this.elements.levelUpMessage.classList.remove('show', 'minimized');
    }

    exitShop() {
        this.state.isInShop = false;
        this.state.isPreparing = true;
        this.state.currentRerolls = 0;
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
        this.elements.inputField = document.getElementById('input-field');
        this.elements.currentWordElement = document.getElementById('current-word');
        this.elements.enemyArea = document.getElementById('enemy-area');

        // イベントリスナーを再設定
        this.setupEventListeners();

        // 敵を生成して表示
        this.spawnEnemy();
        this.updateEnemyDisplay();

        // 2秒後にゲームを再開
        setTimeout(() => {
            this.state.isPreparing = false;
            this.elements.inputField.disabled = false;
            this.elements.inputField.focus();
            this.gameLoop();
        }, 2000);
    }

    spawnSpecialEnemy() {
        const word = words.special[Math.floor(Math.random() * words.special.length)];
        const enemy = {
            word: word,
            difficulty: 'special',
            x: this.elements.enemyArea.clientWidth,
            y: Math.random() * (this.elements.enemyArea.clientHeight - 50),
            speed: 0.3, // 特殊敵は遅め
            timeLimit: 30000, // 30秒
            spawnTime: Date.now()
        };
        this.state.enemies.push(enemy);
        this.updateEnemyDisplay();
    }

    rerollShopItems() {
        if (this.state.currentRerolls < this.state.maxRerolls) {
            this.state.currentRerolls++;
            this.generateShopItems();
            this.updateShopDisplay();
        }
    }

    addToInventory(item) {
        this.state.inventory.push({
            ...item,
            purchaseDate: new Date().toISOString()
        });
        this.saveGameState();
    }

    removeFromInventory(itemName) {
        this.state.inventory = this.state.inventory.filter(item => item.name !== itemName);
        this.saveGameState();
    }

    purchaseItem(index) {
        const item = this.state.shopItems[index];
        if (this.state.coins >= item.cost) {
            this.state.coins -= item.cost;

            if (item.type === 'ability') {
                const abilityKey = item.name === 'スマートレジ' ? 'smartRegister' : 'tipTip';
                this.state.abilities[abilityKey].active = true;
                this.state.abilities[abilityKey].purchased = true;
            } else {
                // アイテムをインベントリに追加
                this.addToInventory(item);
            }

            this.state.shopItems.splice(index, 1);
            this.updateShopDisplay();
            this.updateStatus();
        }
    }

    updateShopDisplay() {
        const gameArea = document.getElementById('game-area');
        gameArea.innerHTML = `
            <div class="shop-container">
                <h2>ショップ</h2>
                <div class="coins-display">コイン: ${this.state.coins}</div>
                <div class="reroll-info">再抽選残り: ${this.state.maxRerolls - this.state.currentRerolls}回</div>
                <div class="shop-items">
                    ${this.state.shopItems.map((item, index) => `
                        <div class="shop-item">
                            <h3>${item.name}</h3>
                            <p>${item.description}</p>
                            <p>価格: ${item.cost}コイン</p>
                            <button onclick="game.purchaseItem(${index})" 
                                ${this.state.coins < item.cost ? 'disabled' : ''}>
                                ${item.type === 'ability' ? 'アビリティを購入' : '購入'}
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="game.rerollShopItems()" ${this.state.currentRerolls >= this.state.maxRerolls ? 'disabled' : ''}>
                    再抽選
                </button>
                <p class="shop-instruction">Enterキーを長押しして次のレベルへ</p>
            </div>
        `;
    }

    checkLevelProgress() {
        const currentGoal = this.levelGoals[this.state.level];
        if (this.state.score >= currentGoal && !this.state.isInShop) {
            this.elements.levelUpMessage.textContent = `レベル${this.state.level}クリア！\nスコア: ${this.state.score}\nEnterキーを長押しして次のレベルへ`;
            this.elements.levelUpMessage.classList.add('show');

            // 2秒後にミニマイズ
            setTimeout(() => {
                this.elements.levelUpMessage.classList.add('minimized');
            }, 2000);

            // enterキーを長押ししてshop
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !this.state.enterKeyPressed) {
                    this.state.enterKeyPressed = true;
                    this.state.enterKeyTimer = setTimeout(() => {
                        this.enterShop();
                    }, 1000);
                }
            });
        }
    }

    updateStatus() {
        document.getElementById('health').textContent = `HP: ${this.state.health}`;
        document.getElementById('level').textContent = `Level: ${this.state.level} (目標: ${this.levelGoals[this.state.level]})`;
        document.getElementById('score').textContent = this.state.isInShop ?
            `コイン: ${this.state.coins}` :
            `Score: ${this.state.score}`;

        // インベントリの表示も更新
        this.updateInventoryDisplay();
    }

    gameLoop() {
        if (this.state.isInShop || this.state.isPreparing) {
            return;
        }

        const currentTime = Date.now();

        // 時間経過によるお昼時の判定
        this.updateGameTime();

        this.updateEnemies(currentTime);
        this.checkEnemySpawn();
        this.updateEnemyDisplay();

        if (this.state.health <= 0) {
            this.handleGameOver();
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    updateEnemies(currentTime) {
        this.state.enemies.forEach(enemy => {
            enemy.x -= enemy.speed;

            if (!enemy.spawnTime) {
                enemy.spawnTime = currentTime;
            }

            if (currentTime - enemy.spawnTime > enemy.timeLimit) {
                this.handleEnemyTimeout(enemy);
            }

            if (enemy.x < -100) {
                this.resetEnemyPosition(enemy);
            }
        });
    }

    handleEnemyTimeout(enemy) {
        if (!this.state.isInvincible) {
            this.state.health -= enemy.isTroubleCustomer ? 6 : 3;
        }
        this.removeEnemy(enemy);
        this.updateStatus();

        if (this.state.level === 1 && this.state.enemies.length === 0) {
            this.spawnEnemy();
        }
    }

    resetEnemyPosition(enemy) {
        enemy.x = this.elements.enemyArea.clientWidth;
        enemy.y = Math.random() * (this.elements.enemyArea.clientHeight - 50);
        enemy.speed = this.getSpeedForLevel();
    }

    checkEnemySpawn() {
        const maxEnemies = this.getMaxEnemies();
        if (this.state.enemies.length < maxEnemies) {
            this.spawnEnemy();
        }
    }

    handleGameOver() {
        alert(`ゲームオーバー！\nレベル: ${this.state.level}\nスコア: ${this.state.score}`);
        this.reset();
    }

    reset() {
        this.state.health = 100;
        this.state.level = 1;
        this.state.score = 0;
        this.state.enemies = [];
        resetAbilityStates();
        resetItemStates();
        this.updateStatus();
        this.elements.levelUpMessage.classList.remove('show', 'minimized');
        this.gameLoop();
    }

    start() {
        this.gameLoop();
    }

    // ゲームの状態を保存
    saveGameState() {
        const gameState = {
            health: this.state.health,
            level: this.state.level,
            score: this.state.score,
            coins: this.state.coins,
            day: this.state.day,
            abilities: this.state.abilities,
            unlockedWords: this.state.unlockedWords,
            inventory: this.state.inventory
        };
        localStorage.setItem('fastFoodWorkerState', JSON.stringify(gameState));
    }

    // ゲームの状態を読み込み
    loadGameState() {
        const savedState = localStorage.getItem('fastFoodWorkerState');
        if (savedState) {
            const gameState = JSON.parse(savedState);
            this.state.health = gameState.health;
            this.state.level = gameState.level;
            this.state.score = gameState.score;
            this.state.coins = gameState.coins;
            this.state.day = gameState.day;
            this.state.abilities = gameState.abilities;
            this.state.unlockedWords = gameState.unlockedWords;
            this.state.inventory = gameState.inventory || [];
        }
    }

    // インベントリの表示を更新
    updateInventoryDisplay() {
        const inventoryArea = document.getElementById('inventory-area');
        if (!inventoryArea) return;

        inventoryArea.innerHTML = `
            <h3>インベントリ</h3>
            <div class="inventory-items">
                ${this.state.inventory.map(item => `
                    <div class="inventory-item">
                        <span>${item.name}</span>
                        <button onclick="game.useItem('${item.name}')">使用</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 敵の最大数を取得
    getMaxEnemies() {
        let maxEnemies = 1;

        // レベルに応じて最大数を増やす
        maxEnemies += Math.floor(this.state.level / 2);

        // お昼時は最大数を増やす
        if (this.state.isLunchTime) {
            maxEnemies += 2;
        }

        return maxEnemies;
    }

    // モバイルデバイスの判定
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// ゲーム開始
const game = new FastFoodWorker();
game.start();