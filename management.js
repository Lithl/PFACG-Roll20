var bshields = bshields || {};
bshields.characters = (function() {
    'use strict';
    
    var version = 0.19,
        initialState = {
            version: version,
            charData: {},
            adventureData: {
                pathIndex: 0,
                scenarioIndex: 0,
                blessingsDeck: [],
                blessingsDiscard: [],
                locations: []
            },
            hctfHenchmen: [],
            deckData: {},
            gameRunning: false,
            lockDeal: false,
            usePromos: true,
            useExpansion: true,
            useClassDecks: {
                //barbarian: false,
                bard: false,
                cleric: false,
                fighter: false,
                ranger: false,
                rogue: false,
                sorcerer: false,
                wizard: false,
                paladin: false,
                monk: false,
                druid: false
            },
            keys: {
                adventurePath: '',
                adventures: [
                    // Perils of the Lost Coast
                    { adventureKey: '', scenarioKeys: ['', '', ''] },
                    // Burnt Offerings
                    { adventureKey: '', scenarioKeys: ['', '', '', '', ''] },
                    // The Skinsaw Murders
                    { adventureKey: '', scenarioKeys: ['', '', '', '', ['', '', '', '']] },
                    // The Hook Mountain Massacre
                    { adventureKey: ['', ''], scenarioKeys: ['', '', '', '', ['', '', '']] },
                    // Fortress of the Stone Giants
                    { adventureKey: '', scenarioKeys: ['', '', '', '', ['', '']] },
                    // Sins of the Saviors
                    { adventureKey: '', scenarioKeys: [['', ''], '', '', ['', '', ''], ''] },
                    // Spires of Xin-Shalast
                    { adventureKey: '', scenarioKeys: ['', '', '', '', ['', '', '']] }
                ]
            }
        },
        system,
        commands = {
            start: function(args, msg) {
                var playerCharacters = _.reject(findObjs({ type: 'character' }), function(char) {
                    return char.get('controlledby') === '';
                });
                
                if (!playerIsGM(msg.playerid) || state.bshields.pfacg.gameRunning || playerCharacters.length === 0) return;
                
                state.bshields.pfacg.gameRunning = true;
                copyDecklists();
                _.each(playerCharacters, function(char) {
                    state.bshields.pfacg.charData[char.get('controlledby')] = {
                        cardFeats: {
                            weapon: 0,
                            spell: 0,
                            armor: 0,
                            item: 0,
                            ally: 0,
                            blessing: 0
                        },
                        skillFeats: {
                            strength: 0,
                            dexterity: 0,
                            constitution: 0,
                            intelligence: 0,
                            wisdom: 0,
                            charisma: 0
                        },
                        powerFeats: {
                            hand: 0,
                            proficientLight: 0,
                            proficientHeavy: 0,
                            proficientWeapons: 0,
                            unique: {}
                        },
                        deck: [],
                        hand: [],
                        discard: [],
                        bury: [],
                        deckReady: false
                    };
                    
                    _.each(bshields.chardata[char.get('name').toLowerCase()].powers.unique, function(value, key) {
                        state.bshields.pfacg.charData[char.get('controlledby')].powerFeats.unique[key] = 0;
                    });
                });
                
                sendChat(system, 'The GM has begun the game. You may no longer relinquish characters;'
                    + ' new characters may be selected if and only if your current character dies. It'
                    + ' is time to begin constructing your starting deck.<br>[Construct Deck](!deckbuild)');
            },
            reset: function(args, msg) {
                if (!playerIsGM(msg.playerid)) return;
                
                resetHelper();
                
                sendChat(system, 'The GM has reset the game. All characters have been relinquished and all'
                    + ' adventure progress has been erased.');
            },
            help: function(command, args, msg) {
                if (_.isFunction(commands['help_' + command])) {
                    commands['help_' + command](args, msg);
                }
            }
        };
    
    function resetHelper() {
        state.bshields.pfacg = initialState;;
        _.each(findObjs({ type: 'character' }), function(char) {
            bshields.main.freeCharacter(char.id);
        });
        _.chain(findObjs({ type: 'graphic', layer: 'objects', controlledby: 'all' }))
         .reject(function(graphic) { return graphic.get('name') === 'freeze'; })
         .each(function(graphic) {
            graphic.remove();
         })
    }
    
    function getDeckRestrictions(playerid) {
        var character = findObjs({ type: 'character', controlledby: playerid })[0];
        
        if (character) {
            return _.chain(bshields.chardata[character.get('name').toLowerCase()].cards)
                .map(function(value, key) {
                    var obj = [key, value[state.bshields.pfacg.charData[playerid].cardFeats[key]]];
                    return obj;
                }).object().value();
        }
    }
    
    function handleInput(msg) {
        var isApi = msg.type === 'api',
            args = msg.content.trim().splitArgs(),
            command, arg0, isHelp;
        
        if (isApi) {
            command = args.shift().substring(1).toLowerCase();
            arg0 = args.shift() || '';
            isHelp = arg0.toLowerCase() === 'help' || arg0.toLowerCase() === 'h';
            
            if (!isHelp) {
                if (arg0 && arg0.length > 0) {
                    args.unshift(arg0);
                }
                
                if (_.isFunction(commands[command])) {
                    commands[command](args, msg);
                }
            } else if (_.isFunction(commands.help)) {
                commands.help(command, args, msg);
            }
        } else if (_.isFunction(commands['msg_' + msg.type])) {
            commands['msg_' + msg.type](args, msg);
        }
    }
    
    function registerEventHandlers() {
        on('chat:message', handleInput);
        system = 'character|' + findObjs({ type: 'character', name: 'System' })[0].id;
    }
    
    function checkInstall() {
        if (!state.bshields) {
            state.bshields = {};
        }
        
        if (!state.bshields.pfacg || state.bshields.pfacg.version !== version) {
            resetHelper();
        }
    }
    
    function copyDecklists() {
        state.bshields.pfacg.deckData.weapon = bshields.deckdata.weapon.base;
        state.bshields.pfacg.deckData.spell = bshields.deckdata.spell.base;
        state.bshields.pfacg.deckData.armor = bshields.deckdata.armor.base;
        state.bshields.pfacg.deckData.item = bshields.deckdata.item.base;
        state.bshields.pfacg.deckData.ally = bshields.deckdata.ally.base;
        state.bshields.pfacg.deckData.blessing = bshields.deckdata.blessing.base;
        state.bshields.pfacg.deckData.monster = bshields.deckdata.monster.base;
        state.bshields.pfacg.deckData.barrier = bshields.deckdata.barrier.base;
        
        if (state.bshields.pfacg.usePromos) {
            state.bshields.pfacg.deckData.weapon = state.bshields.pfacg.deckData.weapon.concat(bshields.deckdata.weapon.promo);
            state.bshields.pfacg.deckData.spell = state.bshields.pfacg.deckData.spell.concat(bshields.deckdata.spell.promo);
            state.bshields.pfacg.deckData.armor = state.bshields.pfacg.deckData.armor.concat(bshields.deckdata.armor.promo);
            state.bshields.pfacg.deckData.item = state.bshields.pfacg.deckData.item.concat(bshields.deckdata.item.promo);
            state.bshields.pfacg.deckData.ally = state.bshields.pfacg.deckData.ally.concat(bshields.deckdata.ally.promo);
            state.bshields.pfacg.deckData.blessing =
                state.bshields.pfacg.deckData.blessing.concat(bshields.deckdata.blessing.promo);
            state.bshields.pfacg.deckData.monster = state.bshields.pfacg.deckData.monster.concat(bshields.deckdata.monster.promo);
            state.bshields.pfacg.deckData.barrier = state.bshields.pfacg.deckData.barrier.concat(bshields.deckdata.barrier.promo);
        }
        if (state.bshields.pfacg.useExpansion) {
            state.bshields.pfacg.deckData.weapon =
                state.bshields.pfacg.deckData.weapon.concat(bshields.deckdata.weapon.expansion);
            state.bshields.pfacg.deckData.spell =
                state.bshields.pfacg.deckData.spell.concat(bshields.deckdata.spell.expansion);
            state.bshields.pfacg.deckData.armor =
                state.bshields.pfacg.deckData.armor.concat(bshields.deckdata.armor.expansion);
            state.bshields.pfacg.deckData.item =
                state.bshields.pfacg.deckData.item.concat(bshields.deckdata.item.expansion);
            state.bshields.pfacg.deckData.ally =
                state.bshields.pfacg.deckData.ally.concat(bshields.deckdata.ally.expansion);
            state.bshields.pfacg.deckData.blessing =
                state.bshields.pfacg.deckData.blessing.concat(bshields.deckdata.blessing.expansion);
            state.bshields.pfacg.deckData.monster =
                state.bshields.pfacg.deckData.monster.concat(bshields.deckdata.monster.expansion);
            state.bshields.pfacg.deckData.barrier =
                state.bshields.pfacg.deckData.barrier.concat(bshields.deckdata.barrier.expansion);
        }
        
        _.each(state.bshields.pfacg.deckData, function(deck, type) {
            _.each(deck, function(card, index) {
                state.bshields.pfacg.deckData[type][index].type = type;
            });
        });
    }
    
    return {
        checkInstall: checkInstall,
        registerEventHandlers: registerEventHandlers,
        getDeckRestrictions: getDeckRestrictions
    };
}());

on('ready', function() {
    'use strict';
    
    bshields.characters.checkInstall();
    bshields.characters.registerEventHandlers();
});
