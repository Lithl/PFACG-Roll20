var bshields = bshields || {};
bshields.main = (function() {
    'use strict';
    
    var version = 0.1,
        system, texture,
        commands = {
            advanceblessings: function(args, msg) {
                
            },
            shuffleblessing: function(args, msg) {
                
            },
            tokenmenu: function(args, msg) {
                var tokenName = _.reject(args, function(name) {
                        return name.toLowerCase() === 'freeze' || _.contains(_.keys(bshields.chardata), name.toLowerCase());
                    }).join(' ');
                
                switch (tokenName) {
                    case '':
                        displayAdventurePathMenu(msg.playerid);
                        break;
                    case 'adventure':
                        displayAdventureMenu(msg.playerid);
                        break;
                    case 'scenario':
                        displayScenarioMenu(msg.playerid);
                        break;
                    case 'Blessing Deck':
                        displayBlessingDeckMenu(msg.playerid);
                        break;
                    case 'Blessing Discard':
                        // Blessings discard (passed turns in game)
                        break;
                    case 'location deck':
                        // One of the 8 location decks
                        break;
                    case 'location card':
                        // One of the 8 locations
                        break;
                    case 'Character Deck':
                        // msg.playerid's draw deck
                        break;
                    case 'Character Discard':
                        // msg.playerid's discard pile
                        break;
                    case 'Buried Pile':
                        // msg.playerid's buried cards
                        break;
                    default:
                        // Card in msg.playerid's hand
                        break;
                }
            },
            dealcards: function(args, msg) {
                var characters = _.reject(findObjs({ type: 'character' }), function(char) {
                        return char.get('controlledby') === '';
                    }),
                    numCharacters = characters.length,
                    charactersWithChoices = _.filter(characters, function(char) {
                        var name = char.get('name').toLowerCase(),
                            favored = bshields.chardata[name].favored;
                        
                        return favored.length > 1;
                    }),
                    everyoneReady = _.size(state.bshields.pfacg.charData) > 0,
                    whisper = getWhisperTarget(msg.playerid),
                    locations = getLocations(numCharacters),
                    i, character, favored;
                
                if (!playerIsGM(msg.playerid)) return;
                
                if (state.bshields.pfacg.lockDeal) {
                    sendChat(system, messages.dealingLocked.format(whisper));
                    return;
                }
                
                _.each(state.bshields.pfacg.charData, function(data) {
                    everyoneReady &= data.deckReady;
                });
                
                if (!everyoneReady) {
                    sendChat(system, messages.notEveryoneReady.format(whisper));
                    return;
                }
                
                for (i = 0; i < numCharacters; i++) {
                    character = getPlayerCharacter(i);
                    favored = _.chain(args)
                        .map(function(arg) {
                            var characterTypeArgument = arg.split(':');
                            
                            if (characterTypeArgument && characterTypeArgument.length === 2) {
                                return { character: characterTypeArgument[0].toLowerCase(), favored: characterTypeArgument[1] };
                            } else {
                                return arg;
                            }
                        })
                        .filter(function(arg) { return _.isObject(arg) && arg.character === character.get('name').toLowerCase(); })
                        .value();
                            
                    if (favored.length === 0) {
                        favored = bshields.chardata[character.get('name').toLowerCase()].favored[0];
                    } else if (favored.length === 1) {
                        favored = favored[0].favored;
                    } else {
                        favored = 'ally';
                    }
                    
                    dealCharacter(character, i, favored);
                }
                
                dealBlessingsDeck(30);
                dealScenario(state.bshields.pfacg.adventureData.pathIndex, state.bshields.pfacg.adventureData.scenarioIndex);
                dealLocations(
                    state.bshields.pfacg.adventureData.pathIndex,
                    state.bshields.pfacg.adventureData.scenarioIndex,
                    numCharacters
                );
                
                // Don't deal multiple times!
                state.bshields.pfacg.lockDeal = true;
            },
            deckcomplete: function(args, msg) {
                var whisper = getWhisperTarget(msg.playerid),
                    decksize = bshields.characters.getDeckRestrictions(msg.playerid),
                    numCardsNeeded = 0,
                    playerCharacterName = getCharacterForPlayer(msg.playerid).get('name'),
                    favoredCards = bshields.chardata[playerCharacterName.toLowerCase()].favored;
                
                if (state.bshields.pfacg.charData[msg.playerid].deckReady) {
                    sendChat(system, messages.deckReady.format(whisper));
                    if (favoredCards.length > 1) {
                        sendChat(system, messages.notifyGMFavoredChoice.format(whisper,
                            _.reduce(favoredCards, function(memo, type, index, list) {
                                if (index === 0) return memo;
                                
                                memo += ', ';
                                if (index === list.length - 1) {
                                    memo += 'or ';
                                }
                                return memo + '<b>' + type.firstCap() + '</b>';
                            }, '<b>' + favoredCards[0].firstCap() + '</b>')));
                    }
                    return;
                }
                
                _.each(decksize, function(totalNeeded, key) {
                    var numCardsOfType = _.filter(state.bshields.pfacg.charData[msg.playerid].deck, function(card) {
                            return card.type === key;
                        }).length;
                    
                    numCardsNeeded += totalNeeded - numCardsOfType;
                });
                
                if (numCardsNeeded > 0) {
                    displayMainDeckMenu(msg.playerid);
                    return;
                }
                
                state.bshields.pfacg.charData[msg.playerid].deckReady = true;
                sendChat(system, messages.deckReady.format(whisper));
                if (favoredCards.length > 1) {
                    sendChat(system, messages.notifyGMFavoredChoice.format(whisper,
                        _.reduce(favoredCards, function(memo, type, index, list) {
                            if (index === 0) return memo;
                            
                            memo += ', ';
                            if (index === list.length - 1) {
                                memo += 'or ';
                            }
                            return memo + '<b>' + type.firstCap() + '</b>';
                        }, '<b>' + favoredCards[0].firstCap() + '</b>')));
                }
            },
            viewcard: function(args, msg) {
                var type = args.shift();
                
                displayCardImage(msg.playerid, type, args.join(' '));
                displayBasicCardList(type, msg.playerid);
            },
            choosecard: function(args, msg) {
                var type = args.shift(),
                    numCardsOfType = _.filter(state.bshields.pfacg.charData[msg.playerid].deck, function(card) {
                        return card.type === type
                    }).length,
                    totalNeeded = bshields.characters.getDeckRestrictions(msg.playerid)[type],
                    name = args.join(' '),
                    deck = _.chain(state.bshields.pfacg.deckData[type])
                            .groupBy(function(card) { return card.name.replace('\'', ''); })
                            .value(),
                    cardToAdd = deck[name.replace('\'', '')].shift(),
                    whisper = getWhisperTarget(msg.playerid),
                    playerCharacterName = getCharacterForPlayer(msg.playerid).get('name'),
                    favoredCards = bshields.chardata[playerCharacterName.toLowerCase()].favored;
                
                if (state.bshields.pfacg.charData[msg.playerid].deckReady) {
                    sendChat(system, messages.deckReady.format(whisper));
                    if (favoredCards.length > 1) {
                        sendChat(system, messages.notifyGMFavoredChoice.format(whisper,
                            _.reduce(favoredCards, function(memo, type, index, list) {
                                if (index === 0) return memo;
                                
                                memo += ', ';
                                if (index === list.length - 1) {
                                    memo += 'or ';
                                }
                                return memo + '<b>' + type.firstCap() + '</b>';
                            }, '<b>' + favoredCards[0].firstCap() + '</b>')));
                    }
                    return;
                }
                
                if (totalNeeded > numCardsOfType) {
                    state.bshields.pfacg.deckData[type] = _.flatten(deck);
                    state.bshields.pfacg.charData[msg.playerid].deck.push(cardToAdd);
                } else {
                    sendChat(system, messages.tooManyCards.format(whisper, type.firstCap()));
                }
                
                displayMainDeckMenu(msg.playerid);
            },
            addcard: function(args, msg) {
                var numCardsOfType = _.filter(state.bshields.pfacg.charData[msg.playerid].deck, function(card) {
                        return card.type === args[0].toLowerCase();
                    }).length,
                    totalNeeded = bshields.characters.getDeckRestrictions(msg.playerid)[args[0].toLowerCase()],
                    whisper = getWhisperTarget(msg.playerid),
                    playerCharacterName = getCharacterForPlayer(msg.playerid).get('name'),
                    favoredCards = bshields.chardata[playerCharacterName.toLowerCase()].favored;
                
                if (state.bshields.pfacg.charData[msg.playerid].deckReady) {
                    sendChat(system, messages.deckReady.format(whisper));
                    if (favoredCards.length > 1) {
                        sendChat(system, messages.notifyGMFavoredChoice.format(whisper,
                            _.reduce(favoredCards, function(memo, type, index, list) {
                                if (index === 0) return memo;
                                
                                memo += ', ';
                                if (index === list.length - 1) {
                                    memo += 'or ';
                                }
                                return memo + '<b>' + type.firstCap() + '</b>';
                            }, '<b>' + favoredCards[0].firstCap() + '</b>')));
                    }
                    return;
                }
                
                if (totalNeeded - numCardsOfType <= 0) {
                    sendChat(system, messages.tooManyCards.format(whisper, args[0]));
                    displayMainDeckMenu(msg.playerid);
                    return;
                }
                
                displayBasicCardList(args[0].toLowerCase(), msg.playerid);
            },
            resetcard: function(args, msg) {
                var cardsToRemove = _.filter(state.bshields.pfacg.charData[msg.playerid].deck, function(card) {
                        return card.type === args[0].toLowerCase();
                    }),
                    whisper = getWhisperTarget(msg.playerid),
                    playerCharacterName = getCharacterForPlayer(msg.playerid).get('name'),
                    favoredCards = bshields.chardata[playerCharacterName.toLowerCase()].favored;
                
                if (state.bshields.pfacg.charData[msg.playerid].deckReady) {
                    sendChat(system, messages.deckReady.format(whisper));
                    if (favoredCards.length > 1) {
                        sendChat(system, messages.notifyGMFavoredChoice.format(whisper,
                            _.reduce(favoredCards, function(memo, type, index, list) {
                                if (index === 0) return memo;
                                
                                memo += ', ';
                                if (index === list.length - 1) {
                                    memo += 'or ';
                                }
                                return memo + '<b>' + type.firstCap() + '</b>';
                            }, '<b>' + favoredCards[0].firstCap() + '</b>')));
                    }
                    return;
                }
                
                state.bshields.pfacg.charData[msg.playerid].deck =
                    _.difference(state.bshields.pfacg.charData[msg.playerid].deck, cardsToRemove);
                state.bshields.pfacg.deckData[args[0].toLowerCase()] =
                    state.bshields.pfacg.deckData[args[0].toLowerCase()].concat(cardsToRemove);
                
                displayMainDeckMenu(msg.playerid);
            },
            deckbuild: function(args, msg) {
                var whisper = getWhisperTarget(msg.playerid),
                    playerCharacterName = getCharacterForPlayer(msg.playerid).get('name'),
                    favoredCards = bshields.chardata[playerCharacterName.toLowerCase()].favored;
                
                if (state.bshields.pfacg.charData[msg.playerid].deckReady) {
                    sendChat(system, messages.deckReady.format(whisper));
                    if (favoredCards.length > 1) {
                        sendChat(system, messages.notifyGMFavoredChoice.format(whisper,
                            _.reduce(favoredCards, function(memo, type, index, list) {
                                if (index === 0) return memo;
                                
                                memo += ', ';
                                if (index === list.length - 1) {
                                    memo += 'or ';
                                }
                                return memo + '<b>' + type.firstCap() + '</b>';
                            }, '<b>' + favoredCards[0].firstCap() + '</b>')));
                    }
                    return;
                }
                
                displayMainDeckMenu(msg.playerid);
            },
            togglepromo: function(args, msg) {
                if (!playerIsGM(msg.playerid)) return;
                
                state.bshields.pfacg.usePromos = !state.bshields.pfacg.usePromos;
                sendChat(system, messages.promoStateChanged.format(state.bshields.pfacg.usePromos ? 'enabled' : 'disabled'));
                displayMainMenu(msg.playerid);
            },
            toggleexpansion: function(args, msg) {
                if (!playerIsGM(msg.playerid)) return;
                
                state.bshields.pfacg.useExpansion = !state.bshields.pfacg.useExpansion;
                sendChat(system, messages.expansionStateChanged.format(
                    state.bshields.pfacg.useExpansion ? 'enabled' : 'disabled'));
                displayMainMenu(msg.playerid);
            },
            toggleclassdeck: function(args, msg) {
                var clazz = args.length > 0 ? args[0].toLowerCase() : '';
                
                if (!playerIsGM(msg.playerid)) return;
                if (args.length === 0) return;
                
                if (_.has(state.bshields.pfacg.useClassDecks, clazz)) {
                    state.bshields.pfacg.useClassDecks[clazz] = !state.bshields.pfacg.useClassDecks[clazz];
                    sendChat(system, messages.classDeckStateChanged.format(
                        clazz.firstCap(),
                        state.bshields.pfacg.useClassDecks[clazz] ? 'enabled' : 'disabled'
                    ));
                    displayMainMenu(msg.playerid);
                }
            },
            menu: function(args, msg) {
                displayMainMenu(msg.playerid);
            },
            choose: function(args, msg) {
                var whisper = getWhisperTarget(msg.playerid),
                    playerCharacter = getCharacterForPlayer(msg.playerid),
                    numPlayerCharacters = _.reject(findObjs({ type: 'character' }), function(char) {
                        return char.get('controlledby') === '';
                    }).length;
                
                if (args.length === 0) {
                    displayCharacterSelectionMenu(msg.playerid);
                } else {
                    if (playerCharacter) {
                        sendChat(system, messages.alreadyControl.format(whisper, playerCharacter.get('name')));
                        return;
                    }
                    
                    if (numPlayerCharacters >= 6) {
                        sendChat(system, messages.fullParty);
                        sendChat(system, '/w gm [Start Game](!start)');
                        return;
                    }
                    
                    claimCharacter(args[0], msg.playerid, numPlayerCharacters);
                }
            },
            free: function(args, msg) {
                relinquishCharacter(msg.playerid);
            },
            help: function(command, args, msg) {
                if (_.isFunction(commands['help_' + command])) {
                    commands['help_' + command](args, msg);
                }
            }
        },
        messages = {
            relinquishedCharacter: '{0}Control over {1} relinquished.',
            cantRelinquish: '{0}You do not have a character to relinquish control. [Select Character](!choose)',
            gainedControl: '{0}You are now controlling {1}.',
            anotherControls: '{0}Another player already controls {1}',
            alreadyControl: '{0}You already have control of {1}. Relinquish your character before selecting another one.'
                + ' [Relinquish {1}](!free)',
            characterSelectMenu: '{0}<br>The following characters are available:',
            characterSelectButton: '<br><a href="!choose {0}" style="border-top:2px solid #ccc;border-left:2px solid #ccc;'
                + 'border-right:2px solid #888;border-bottom:2px solid #888;background:#aaa;min-width:82px;margin-bottom:3px">'
                + '<img src="{1}" height="30" width="30" style="vertical-align:middle"> {2}</a>',
            characterSelectMenuButton: '<br><a href="!choose" style="width:94%">Select Character</a>',
            characterRelinquishMenuButton: '<br><a href="!free" style="width:94%">Relinquish {0}</a>',
            startGameMenuButton: '<br><a href="!start" style="width:94%">Start Game</a>',
            resetGameMenuButton: '<br><a href="!reset" style="width:94%">Reset Game</a>',
            dealCardsMenuButton: '<br><a href=\'!dealcards ?{Favored Card Choices (e.g. "lem:weapon")}\' style="width:94%">Deal'
                + ' Cards</a>',
            usingPromosMenuToggle: '<br><a href="!togglepromo" style="width:94%">{0} Promos</a>',
            usingExpansionMenuToggle: '<br><a href="!toggleexpansion" style="width:94%">{0} Expansion</a>',
            usingClassDeckMenuToggle: '<br><a href="!toggleclassdeck {0}" style="width:94%">{1} CD: {0}</a>',
            fullParty: 'A full party of 6 characters has already been selected. No further characters may be selected'
                + ' unless a character is relinquished. The GM should start the game now.',
            promoStateChanged: 'Promotional cards are now <b>{0}</b>.',
            expansionStateChanged: 'Character Expansion cards are now <b>{0}</b>.',
            classDeckStateChanged: 'Cards from Class Deck: <b>{0}</b> are now <b>{1}</b>.',
            deckMainMenu: '{0}<br>Number of cards still needed in your deck:',
            constructDeckSelectCardType: '<br><a href="!addcard {0}" style="text-align:right;width:40%">{0}: {1}</a>'
                + ' <a href="!resetcard {0}" style="float:right">Reset</a>',
            tooManyCards: '{0}You already have the maximum number of {1} cards in your deck.',
            deckCardSelection: '{0}<br>Choose a(n) {1} card to add to your deck:',
            cardAddButton: '<br><a href="!choosecard {1} {0}" style="width:70%">{0}</a>'
                + ' <a href="!viewcard {1} {0}" style="float:right">View</a>',
            markDeckComplete: '<br><a href="!deckcomplete" style="margin-top:2.5px;width:94%">Deck Complete</a>',
            cardImage: '{0}<br><img src="{1}" />',
            deckReady: '{0}Your deck is ready, and cannot be modified again except by acquiring cards, or after the scenario'
                + ' if you have banished enough cards.',
            notifyGMFavoredChoice: '{0}You have options for your favored card type. Make sure to notify the GM of cour choice.'
                + ' You may choose one of: {1}.',
            notEveryoneReady: '{0}Not all players are ready. Wait for all players to press the "Deck Complete" button'
                + ' before dealing the cards.',
            dealingLocked: '{0}You cannot deal out decks at this time.',
            adventureText: '/direct <h3 style="line-height:18px;text-align:center">Adventure: <em>{0}</em></h3>'
                + '<div style="font-size:90%;text-align:justify">{1}</div>',
            scenarioText: '/direct <h3 style="line-height:18px;text-align:center">Scenario {0}: <em>{1}</em></h3>'
                + '<div style="font-size:90%;text-align:justify">{2}</div>',
            adventurePath: 'Rise of the Runelords adventure path completed! [Gain a Card Feat](!cardfeat {0})',
            adventure: '{0} adventure completed!',
            scenario: 'Scenario {0}: {1} completed!',
            discardBlessing: '<br><a href="!advanceblessings" style="width:94%">Advance Blessings Deck</a>',
            shuffleBlessing: '<br><a href="!shuffleblessing @{target|token_id}" style="width:94%">Shuffle Into Location</a>'
        };
    
    function displayBlessingDeckMenu(playerid) {
        var whisper = getWhisperTarget(playerid),
            message = whisper;
        
        message += messages.discardBlessing;
        message += messages.shuffleBlessing;
        sendChat(system, message);
    }
    
    function displayScenarioMenu(playerid) {
        var key = String.guid(),
            key2 = String.guid(),
            key3 = String.guid(),
            key4 = String.guid(),
            keys = [key, key2, key3, key4],
            pathIndex = state.bshields.pfacg.adventureData.pathIndex,
            scenarioIndex = state.bshields.pfacg.adventureData.scenarioIndex,
            scenario = bshields.carddata.adventures[pathIndex].scenarios[scenarioIndex],
            message = messages.scenario.format(scenarioIndex + 1, scenario.name) + ' ' + scenario.reward;
        
        if (playerIsGM(playerid)) {
            if (_.isArray(state.bshields.pfacg.keys.adventures[pathIndex].scenarioKeys[scenarioIndex])) {
                state.bshields.pfacg.keys.adventures[pathIndex].scenarioKeys[scenarioIndex] = 
                    keys.slice(0, state.bshields.pfacg.keys.adventures[pathIndex].scenarioKeys[scenarioIndex].length);
            } else {
                state.bshields.pfacg.keys.adventures[pathIndex].scenarioKeys[scenarioIndex] = key;
            }
            sendChat(system, message.format(key, key2, key3, key4));
        }
    }
    
    function displayAdventureMenu(playerid) {
        var key = String.guid(),
            key2 = String.guid(),
            pathIndex = state.bshields.pfacg.adventureData.pathIndex,
            adventure = bshields.carddata.adventures[pathIndex],
            message = messages.adventure.format(adventure.name) + ' ' + adventure.reward;
        
        if (playerIsGM(playerid)) {
            if (_.isArray(state.bshields.pfacg.keys.adventures[pathIndex].adventureKey)) {
                state.bshields.pfacg.keys.adventures[pathIndex].adventureKey = [key, key2];
            } else {
                state.bshields.pfacg.keys.adventures[pathIndex].adventureKey = key;
            }
            sendChat(system, message.format(key, key2));
        }
    }
    
    function displayAdventurePathMenu(playerid) {
        var key = String.guid();
        
        if (playerIsGM(playerid)) {
            state.bshields.pfacg.keys.adventurePath = key;
            sendChat(system, messages.adventurePath.format(key));
        }
    }
    
    function dealLocations(pathIndex, scenarioIndex, numCharacters) {
        var adventure = bshields.carddata.adventures[pathIndex],
            scenario = adventure.scenarios[scenarioIndex],
            locations = [],
            i;
        
        for (i = 0; i < numCharacters; i++) {
            locations = locations.concat(scenario.locations[i]);
        }
        
        locations = _.map(locations, function(locationName) {
            return bshields.carddata.locations[locationName];
        });
        
        _.each(locations, function(loc, index) {
            var locationPositions = bshields.locations.locations[index];
            
            createObj('graphic', {
                left: locationPositions.deck.left,
                top: locationPositions.deck.top,
                width: 128,
                height: 180,
                imgsrc: bshields.carddata.back,
                pageid: Campaign().get('playerpageid'),
                layer: 'objects',
                name: 'freeze "location deck"',
                controlledby: 'all',
                playersedit_name: false,
                playersedit_bar1: false,
                playersedit_bar2: false,
                playersedit_bar3: false,
                playersedit_aura1: false,
                playersedit_aura2: false
            });
            
            createObj('graphic', {
                left: locationPositions.card.left,
                top: locationPositions.card.top,
                width: 128,
                height: 180,
                imgsrc: loc.imgsrc,
                pageid: Campaign().get('playerpageid'),
                layer: 'objects',
                name: 'freeze "location card"',
                controlledby: 'all',
                playersedit_name: false,
                playersedit_bar1: false,
                playersedit_bar2: false,
                playersedit_bar3: false,
                playersedit_aura1: false,
                playersedit_aura2: false
            });
        });
    }
    
    function dealScenario(pathIndex, scenarioIndex) {
        var adventure = bshields.carddata.adventures[pathIndex],
            scenario = adventure.scenarios[scenarioIndex];
        
        createObj('graphic', {
            left: bshields.locations.scenario.left,
            top: bshields.locations.scenario.top,
            width: 128,
            height: 180,
            imgsrc: scenario.imgsrc,
            pageid: Campaign().get('playerpageid'),
            layer: 'objects',
            name: 'freeze scenario',
            controlledby: 'all',
            playersedit_name: false,
            playersedit_bar1: false,
            playersedit_bar2: false,
            playersedit_bar3: false,
            playersedit_aura1: false,
            playersedit_aura2: false
        });
        
        if (scenarioIndex === 0) {
            createObj('graphic', {
                left: bshields.locations.adventure.left,
                top: bshields.locations.adventure.top,
                width: 128,
                height: 180,
                imgsrc: adventure.imgsrc,
                pageid: Campaign().get('playerpageid'),
                layer: 'objects',
                name: 'freeze adventure',
                controlledby: 'all',
                playersedit_name: false,
                playersedit_bar1: false,
                playersedit_bar2: false,
                playersedit_bar3: false,
                playersedit_aura1: false,
                playersedit_aura2: false
            });
            
            sendChat('', '/desc ');
            sendChat('', messages.adventureText.format(adventure.name, adventure.text));
            
            setTimeout(function() {
                sendChat('', '/desc ');
                sendChat('', messages.scenarioText.format(scenarioIndex + 1, scenario.name, scenario.text));
            }, 5000);
        } else {
            sendChat('', '/desc ');
            sendChat('', messages.scenarioText.format(scenarioIndex + 1, scenario.name, scenario.text));
        }
    }
    
    function dealBlessingsDeck(deckSize) {
        var i;
        
        state.bshields.pfacg.deckData.blessing = _.shuffle(state.bshields.pfacg.deckData.blessing);
        for (i = 0; i < deckSize; i++) {
            state.bshields.pfacg.adventureData.blessingsDeck.push(state.bshields.pfacg.deckData.blessing.shift());
        }
        createObj('graphic', {
            left: bshields.locations.blessingDeck.left,
            top: bshields.locations.blessingDeck.top,
            width: 128,
            height: 180,
            imgsrc: bshields.carddata.back,
            pageid: Campaign().get('playerpageid'),
            layer: 'objects',
            name: 'freeze "Blessing Deck"',
            controlledby: 'all',
            playersedit_name: false,
            playersedit_bar1: false,
            playersedit_bar2: false,
            playersedit_bar3: false,
            playersedit_aura1: false,
            playersedit_aura2: false
        });
    }
    
    function dealCharacter(character, i, favored) {
        var handSize = getHandSize(character.get('controlledby'), character.get('name')),
            hand = [],
            tmpDiscard = [],
            handContainsFavored = false,
            tmpDeck, j;
        
        // Shuffle deck
        state.bshields.pfacg.charData[character.get('controlledby')].deck =
            _.shuffle(state.bshields.pfacg.charData[character.get('controlledby')].deck);
        
        // Display deck
        createObj('graphic', {
            left: bshields.locations.players[i].deck.left,
            top: bshields.locations.players[i].deck.top,
            width: 128,
            height: 180,
            imgsrc: bshields.carddata.back,
            pageid: Campaign().get('playerpageid'),
            layer: 'objects',
            name: 'freeze "Character Deck"',
            controlledby: character.get('controlledby'),
            playersedit_name: false,
            playersedit_bar1: false,
            playersedit_bar2: false,
            playersedit_bar3: false,
            playersedit_aura1: false,
            playersedit_aura2: false
        });
        
        // Ensure starting hand contains a favored card
        tmpDeck = state.bshields.pfacg.charData[character.get('controlledby')].deck;
        do {
            for (j = 0; j < handSize; j++) {
                hand.push(tmpDeck.shift());
                if (tmpDeck.length === 0) {
                    tmpDeck = _.shuffle(tmpDiscard);
                    tmpDiscard = [];
                }
            }
            handContainsFavored = _.any(hand, function(card) {
                return card.type === favored;
            });
            
            if (!handContainsFavored) {
                tmpDiscard = tmpDiscard.concat(hand);
                hand = [];
            }
        } while (!handContainsFavored);
        state.bshields.pfacg.charData[character.get('controlledby')].deck = _.shuffle(tmpDeck.concat(tmpDiscard));
        state.bshields.pfacg.charData[character.get('controlledby')].hand = hand;
        layoutHand(i, character.get('controlledby'));
    }
    
    function getLocations(numCharacters) {
        var adventure = state.bshields.pfacg.adventureData.pathIndex,
            scenario = state.bshields.pfacg.adventureData.scenarioIndex;
        
        return _.map(bshields.carddata.adventures[adventure].scenarios[scenario].locations, function(locationName) {
            return bshields.carddata.locations[locationName];
        });
    }
    
    function layoutHand(index, playerid) {
        var character = getCharacterForPlayer(playerid),
            handPos = bshields.locations.players[index].hand,
            existingCards = _.reject(findObjs({
                    type: 'graphic',
                    layer: 'objects',
                    controlledby: playerid
                }), function(graphic) { return graphic.get('name').indexOf('freeze') >= 0; }),
            existingCardNames = _.map(existingCards, function(graphic) { return graphic.get('name'); }),
            fullHand = state.bshields.pfacg.charData[playerid].hand,
            cardsToCreate = _.reject(fullHand, function(card) { return _.contains(existingCardNames, card.name); });
        
        _.each(cardsToCreate, function(card) {
            var newCard = createObj('graphic', {
                left: handPos.left,
                top: handPos.top,
                width: 128,
                height: 180,
                imgsrc: card.imgsrc,
                pageid: Campaign().get('playerpageid'),
                layer: 'objects',
                name: '"' + card.name + '"',
                controlledby: playerid,
                playersedit_name: false,
                playersedit_bar1: false,
                playersedit_bar2: false,
                playersedit_bar3: false,
                playersedit_aura1: false,
                playersedit_aura2: false
            });
            existingCards.push(newCard);
        });
        
        existingCards = _.sortBy(existingCards, function(card) { return card.get('name'); });
        _.each(existingCards, function(card, i) {
            card.set({
                left: handPos.left + i * 130,
                top: handPos.top
            });
        });
    }
    
    function displayCardImage(playerid, type, name) {
        var whisper = getWhisperTarget(playerid),
            message = messages.cardImage.format(whisper, bshields.carddata[type][name].imgsrc.replace('thumb', 'max'));
        
        sendChat(system, message);
    }
    
    function displayBasicCardList(type, playerid) {
        var whisper = getWhisperTarget(playerid),
            message = messages.deckCardSelection.format(whisper, type);
        
        _.chain(state.bshields.pfacg.deckData[type])
            .filter(function(card, index) { return card.basic; })
            .sortBy(function(card) { return card.name; })
            .groupBy(function(card) { return card.name; })
            .each(function(copies, name) {
                message += messages.cardAddButton.format(name, type);
            });
        
        sendChat(system, message);
    }
    
    function displayMainDeckMenu(playerid) {
        var decksize = bshields.characters.getDeckRestrictions(playerid),
            whisper = getWhisperTarget(playerid),
            message = messages.deckMainMenu.format(whisper),
            character = getCharacterForPlayer(playerid),
            numCardsNeeded = 0;
        
        _.each(decksize, function(totalNeeded, key) {
            var numCardsOfType = _.filter(state.bshields.pfacg.charData[playerid].deck, function(card) {
                    return card.type === key;
                }).length;
            
            message += messages.constructDeckSelectCardType.format(key.firstCap(), totalNeeded - numCardsOfType);
            numCardsNeeded += totalNeeded - numCardsOfType;
        });
        
        if (numCardsNeeded <= 0) {
            message += messages.markDeckComplete;
        }
        
        sendChat(system, message);
    }
    
    function claimCharacter(charid, playerid, numCharacters) {
        var whisper = getWhisperTarget(playerid),
            character = getObj('character', charid);
        
        if (character) {
            if (character.get('controlledby') === '') {
                if (!state.bshields.pfacg.useExpansion
                    && _.contains(bshields.characterExpansionCharacters, character.get('name'))) return;
                
                character.set({
                    controlledby: playerid,
                    inplayerjournals: 'all'
                });
                sendChat(system, messages.gainedControl.format(whisper, character.get('name')));
                
                character.get('defaulttoken', function(blob) {
                    var tokendata = JSON.parse(blob),
                        mapToken;
                    
                    createObj('graphic', {
                        left: 560 + 35 * numCharacters,
                        top: 1016,
                        width: tokendata.width,
                        height: tokendata.height,
                        imgsrc: tokendata.imgsrc.replace(/med|max/, 'thumb'),
                        pageid: Campaign().get('playerpageid'),
                        layer: 'objects',
                        name: tokendata.name,
                        represents: tokendata.represents,
                        playersedit_name: false,
                        playersedit_bar1: false,
                        playersedit_bar2: false,
                        playersedit_bar3: false,
                        playersedit_aura1: false,
                        playersedit_aura2: false
                    });
                    
                    mapToken = createObj('graphic', {
                        left: bshields.locations.players[numCharacters].character.left,
                        top: bshields.locations.players[numCharacters].character.top,
                        width: tokendata.width,
                        height: tokendata.height,
                        imgsrc: tokendata.imgsrc.replace(/med|max/, 'thumb'),
                        pageid: Campaign().get('playerpageid'),
                        layer: 'map',
                        represents: tokendata.represents
                    });
                    toFront(mapToken);
                });
            } else {
                sendChat(system, messages.anotherControls.format(whisper, character.get('name')));
            }
        }
    }
    
    function relinquishCharacter(playerid) {
        var whisper = getWhisperTarget(playerid),
            character = getCharacterForPlayer(playerid);
        
        if (character) {
            relinquishCharacterHelper(character.id);
            sendChat(system, messages.relinquishedCharacter.format(whisper, character.get('name')));
        } else {
            sendChat(system, messages.cantRelinquish.format(whisper));
        }
    }
    
    function relinquishCharacterHelper(characterid) {
        var character = getObj('character', characterid);
        
        _.each(findObjs({ type: 'graphic', represents: characterid })
                .concat(findObjs({ type: 'graphic', layer: 'objects', controlledby: character.get('controlledby') })),
            function(obj) { obj.remove(); });
        
        character.set({
            controlledby: '',
            inplayerjournals: ''
        });
    }
    
    function displayCharacterSelectionMenu(to) {
        var whisper = getWhisperTarget(to),
            playerCharacter = getCharacterForPlayer(to),
            messageBody = messages.characterSelectMenu.format(whisper);
        
        if (playerCharacter) {
            sendChat(system, messages.alreadyControl.format(whisper, playerCharacter.get('name')));
            return;
        }
        
        _.chain(findObjs({ type: 'character', controlledby: '' }))
            .reject(function(char) {
                return ('character|'+char.id) === system
                    || (!state.bshields.pfacg.useExpansion
                        && _.contains(bshields.characterExpansionCharacters, char.get('name')));
            })
            .sortBy(function(char) { return char.get('name'); })
            .each(function(char) {
                messageBody += messages.characterSelectButton.format(char.id, char.get('avatar'), char.get('name'));
            });
        
        sendChat(system, messageBody);
    }
    
    function displayMainMenu(to) {
        var whisper = getWhisperTarget(to),
            playerCharacter = getCharacterForPlayer(to),
            message = whisper,
            allPlayerCharacters = _.reject(findObjs({ type: 'character' }), function(char) {
                return char.get('controlledby') === '';
            }),
            playersReady = _.every(allPlayerCharacters, function(char) {
                return state.bshields.pfacg.charData[char.get('controlledby')]
                    && state.bshields.pfacg.charData[char.get('controlledby')].deckReady;
            });
        
        if ((!playerCharacter && !state.bshields.pfacg.gameRunning)
            || (state.bshields.pfacg.gameRunning && state.bshields.pfacg.charData[to]
                && state.bshields.pfacg.charData[to].isDead)) {
            message += messages.characterSelectMenuButton;
        }
        if (playerCharacter && !state.bshields.pfacg.gameRunning) {
            message += messages.characterRelinquishMenuButton.format(playerCharacter.get('name'));
        }
        if (playerIsGM(to)) {
            if (!state.bshields.pfacg.gameRunning) {
                message += messages.startGameMenuButton;
            } else {
                if (playersReady && !state.bshields.pfacg.lockDeal) {
                    message += messages.dealCardsMenuButton;
                }
            }
            message += messages.resetGameMenuButton;
            message += messages.usingPromosMenuToggle.format(state.bshields.pfacg.usePromos ? 'Disable' : 'Enable');
            message += messages.usingExpansionMenuToggle.format(state.bshields.pfacg.useExpansion ? 'Disable' : 'Enable');
            _.chain(state.bshields.pfacg.useClassDecks)
                .map(function(value, key) {
                    var result = { enabled: value };
                    result.name = key;
                    return result;
                })
                .sortBy(function(value) {
                    return value.name;
                })
                .each(function(toggle) {
                    var name = toggle.name.charAt(0).toUpperCase() + toggle.name.slice(1);
                    message += messages.usingClassDeckMenuToggle.format(name, toggle.enabled ? 'Disable' : 'Enable');
                });
        }
        
        if (message !== whisper) {
            sendChat(system, message);
        }
    }
    
    function getHandSize(playerid, characterName) {
        return bshields.chardata[characterName.toLowerCase()]
            .powers.hand[state.bshields.pfacg.charData[playerid].powerFeats.hand];
    }
    
    function getCharacterForPlayer(playerid) {
        return findObjs({ type: 'character', controlledby: playerid })[0];
    }
    
    function getWhisperTarget(to) {
        var whisper = '',
            toName;
        
        if (to) {
            toName = getObj('player', to).get('displayname');
            whisper = '/w ' + toName.split(' ')[0] + ' ';
        }
        return whisper;
    }
    
    function getPlayerCharacter(index) {
        var position = bshields.locations.players[index].character,
            token = findObjs({ type: 'graphic', layer: 'map', left: position.left, top: position.top })[0];
        
        return getObj('character', token.get('represents'));
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
    
    function handlePlayerJoin(obj, prev) {
        if (obj.get('online')) {
            setTimeout(function() { displayMainMenu(obj.id); }, 2000);
        }
    }
    
    function registerEventHandlers() {
        on('chat:message', handleInput);
        on('change:player:_online', handlePlayerJoin);
        system = 'character|' + findObjs({ type: 'character', name: 'System' })[0].id;
        texture = findObjs({ type: 'graphic', name: 'background' })[0];
    }
    
    return {
        registerEventHandlers: registerEventHandlers,
        freeCharacter: relinquishCharacterHelper
    };
}());

on('ready', function() {
    'use strict';
    
    bshields.main.registerEventHandlers();
});
