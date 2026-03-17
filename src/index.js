import Card from "./Card.js";
import Game from "./Game.js";
import TaskQueue from "./TaskQueue.js";
import SpeedRate from "./SpeedRate.js";

function isDuck(card) {
    return card instanceof Duck;
}

function isDog(card) {
    return card instanceof Dog;
}

function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return "Утка-Собака";
    }
    if (isDuck(card)) {
        return "Утка";
    }
    if (isDog(card)) {
        return "Собака";
    }
    return "Существо";
}

class Creature extends Card {
    constructor(name, power) {
        super(name, power);
    }

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

Object.defineProperty(Creature.prototype, 'currentPower', {
    get() {
        if (this._currentPower === undefined) {
            return this.maxPower;
        }
        return this._currentPower;
    },
    set(value) {
        this._currentPower = Math.min(Math.max(value, 0), this.maxPower);
    },
    configurable: true,
    enumerable: true
});

class Duck extends Creature {
    constructor(name = "Мирная утка", power = 2) {
        super(name, power);
    }
    quacks() {
        console.log("quack");
    }
    swims() {
        console.log("float: both;");
    }
}

class Dog extends Creature {
    constructor(name = "Пес-бандит", power = 3) {
        super(name, power);
    }
}

class Trasher extends Dog {
    constructor(name = 'Громила', power = 5) {
        super(name, power);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
            continuation(Math.max(0, value - 1));
        });
    }

    getDescriptions() {
        return [
            'Получает на 1 урон меньше',
            ...super.getDescriptions()
        ];
    }
}

class Lad extends Dog {
    constructor(name = 'Браток', power = 2) {
        super(name, power);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        continuation(value - Lad.getBonus());
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + Lad.getBonus());
    }

    getDescriptions() {
        const base = super.getDescriptions();
        const extra = Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') || Lad.prototype.hasOwnProperty('modifyTakenDamage')
            ? ['Чем их больше, тем они сильнее']
            : [];
        return [...extra, ...base];
    }
}

class Gatling extends Creature {
    constructor(name = 'Гатлинг', power = 6) {
        super(name, power);
    }

    attack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        const oppositeCards = oppositePlayer.table;

        const attackCards = (index) => {
            if (index >= oppositeCards.length) {
                continuation();
                return;
            }

            const card = oppositeCards[index];
            if (card) {
                this.view.signalAbility(() => {
                    this.dealDamageToCreature(2, card, gameContext, () => {
                        attackCards(index + 1);
                    });
                });
            } else {
                attackCards(index + 1);
            }
        };

        attackCards(0);
    }

    getDescriptions() {
        return [
            'Атакует все карты противника по 2 урона',
            ...super.getDescriptions()
        ];
    }
}

class Rogue extends Creature {
    constructor(name = 'Изгой', power = 2) {
        super(name, power);
    }

    doBeforeAttack(gameContext, continuation) {
        const { target, updateView } = gameContext;
        
        const targetProto = Object.getPrototypeOf(target);
        
        const abilities = [
            'modifyDealedDamageToCreature',
            'modifyDealedDamageToPlayer',
            'modifyTakenDamage'
        ];

        abilities.forEach(ability => {
            if (targetProto.hasOwnProperty(ability)) {
                this[ability] = targetProto[ability];
                delete targetProto[ability];
            }
        });

        updateView();
        
        continuation();
    }

    getDescriptions() {
        return [
            'Крадет способности у карт того же типа',
            ...super.getDescriptions()
        ];
    }
}

class Brewer extends Duck {
    constructor(name = 'Пивозавр', power = 2) {
        super(name, power);
    }

    doBeforeAttack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer } = gameContext;
        
        const allCards = currentPlayer.table.concat(oppositePlayer.table);
        const ducks = allCards.filter(card => isDuck(card));

        const healDucks = (index) => {
            if (index >= ducks.length) {
                continuation();
                return;
            }

            const duck = ducks[index];
            this.view.signalAbility(() => {
                duck.maxPower += 1;
                duck.currentPower += 2;
                
                duck.view.signalHeal(() => {
                    duck.updateView();
                    healDucks(index + 1);
                });
            });
        };

        healDucks(0);
    }

    getDescriptions() {
        return [
            'Раздает пиво уткам: +1 макс. сила, +2 текущая сила',
            ...super.getDescriptions()
        ];
    }
}

class PseudoDuck extends Dog {
    constructor(name = 'Псевдоутка', power = 3) {
        super(name, power);
    }

    quacks() {
        console.log("quack");
    }

    swims() {
        console.log("float: both;");
    }

    getDescriptions() {
        return super.getDescriptions();
    }
}

class Nemo extends Creature {
    constructor(name = 'Немо', power = 4) {
        super(name, power);
    }

    doBeforeAttack(gameContext, continuation) {
        const { target, updateView } = gameContext;
        
        const targetProto = Object.getPrototypeOf(target);
        
        this.view.signalAbility(() => {
            Object.setPrototypeOf(this, targetProto);
            
            updateView();
            
            if (targetProto.hasOwnProperty('doBeforeAttack')) {
                targetProto.doBeforeAttack.call(this, gameContext, continuation);
            } else {
                continuation();
            }
        });
    }

    getDescriptions() {
        return [
            'Крадет прототип атакуемой карты',
            ...super.getDescriptions()
        ];
    }
}

const seriffStartDeck = [
    new Duck(),
    new Brewer(),
    new Gatling(),
    new Nemo(),
    new Rogue(),
    new Duck(),
];

const banditStartDeck = [
    new Trasher(),
    new Lad(),
    new Lad(),
    new PseudoDuck(),
    new Dog(),
    new Brewer(),
];

const game = new Game(seriffStartDeck, banditStartDeck);

SpeedRate.set(1);

game.play(false, (winner) => {
    alert("Победил " + winner.name);
});