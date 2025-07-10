const axios = require('axios');
const tmi = require('tmi.js');
const configuration = require('./config');
const chatbot = new tmi.client(configuration);
const fs = require('fs');
const { Stream } = require('stream');
const CLIENT_ID = ''
const OAUTH_TOKEN = ''
const COIN_FILE = 'coins.json';

async function getBroadcasterId(channel) {
    channel = channel.replace('#', '');
    console.log(`Fetching broadcaster ID for: ${channel}`);  // Debug: Log the channel

    try {
        const response = await axios.get(`https://api.twitch.tv/helix/users?login=${channel}`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`,
            }
        });

        const broadcasterId = response.data.data[0]?.id;
        if (!broadcasterId) {
            console.error(`No broadcaster ID found for: ${channel}`);
        }
        return broadcasterId;
    } catch (error) {
        console.error("Error fetching broadcaster ID:", error.response?.data || error.message);
        return null;
    }
}


const validateToken = async () => {
    try {
        const response = await axios.get(`https://api.twitch.tv/helix/users?login=yungfenta`, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`,
            }
        });
        console.log('Token is valid:', response.data);
    } catch (error) {
        console.error('Token validation failed:', error.response.data);
    }
};

async function updateStream(channel, title, game) {
    const broadcasterId = await getBroadcasterId(channel);
    if (!broadcasterId) {
        console.error('Could not retrieve broadcaster ID');
        return;
    }

    const updateData = {};

    if (title) {
        updateData.title = title;
    }

    if (game) {
        updateData.game_name = game;
    }
    console.log('Update data being sent to Twitch API:', updateData);

    if (Object.keys(updateData).length === 0) {
        console.log('No title or game name provided for update.');
        return;
    }

    try {
        const response = await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, updateData, {
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${OAUTH_TOKEN.replace('oauth:', '')}`,
            }
        });

        console.log('Successfully updated stream:', response.data);
        chatbot.say(channel, `Stream updated! Title: "${title || 'no title'}" and Game: "${game || 'no game'}"`);
    } catch (error) {
        console.error('Failed to update stream:', error.response?.data || error.message);
        chatbot.say(channel, `Failed to update stream: ${error.message}`);
    }
}

validateToken();

if (!fs.existsSync(COIN_FILE)) {
    fs.writeFileSync(COIN_FILE, JSON.stringify({}, null, 2));
}

let coins = JSON.parse(fs.readFileSync(COIN_FILE, 'utf8'));
let giveawayParticipants = [];


chatbot.on("message", ChatMessageHandler);
chatbot.connect();

function ChatMessageHandler(channel, tags, message, self) {
    console.log(message, tags, channel);
}

function giveCoins(username, amount) {
    if (!coins[tags.username]) {
        coins[tags.username] = 0;
    }
    coins[tags.username] += amount;

    fs.writeFileSync(COIN_FILE, JSON.stringify(coins, null, 2));
}

chatbot.on('message', async (channel, tags, message, self) => {
	if(self || !message.startsWith('!')) return;

	const args = message.slice(1).split(' ');
	const command = args.shift().toLowerCase();
    const username = tags.username.toLocaleLowerCase();
    
    giveCoins(username, 1)

	if(command === 'discord') {
		chatbot.say(channel, `@${tags.username}, join the discord: https://discord.gg/EcgJ7Dp9Yx `);
	}
    if(command === 'dc') {
		chatbot.say(channel, `@${tags.username}, join the discord: https://discord.gg/EcgJ7Dp9Yx `);
	}
    if(command === 'osu') {
		chatbot.say(channel, `@${tags.username}, https://osu.ppy.sh/users/34205803 `);
	}
    if(command === 'shop') {
		chatbot.say(channel, `@${tags.username}, https://streamelements.com/michaelbobinger/store `);
	}
    if(command === 'lethimcook') {
		chatbot.say(channel, `@${tags.username}, StirThePot `);
	}
    if(command === 'shopping') {
		chatbot.say(channel, `@${tags.username}, https://streamelements.com/michaelbobinger/store `);
	}
    if(command === 'steam') {
		chatbot.say(channel, `@${tags.username}, https://steamcommunity.com/id/04blank40 `);
	}
    if(command === 'emote') {
		chatbot.say(channel, `@${tags.username}, https://7tv.app/ `);
	}
    if(command === 'crowd') {
		chatbot.say(channel, `@${tags.username}, https://interact.crowdcontrol.live/#/twitch/520280758 `);
	}  
    if (command == 'coins') {
        const userCoins = coins[tags.username] || 0;
        chatbot.say(channel, `@${tags.username}, you have ${userCoins} coins `);
    }
    if (command == 'givecoins') {
        const parts = message.split(' ');
        if (parts.length < 3) return;

        const targetUser = parts[1].toLowerCase().replace('@', '');
        const amount = parseInt(parts[2]);

        if (!coins[tags.username] || coins[tags.username] < amount) {
            client.say(channel, `@${tags.username}, you don't have enough coins!`);
            return;
        }

        if (amount > 0) {
            giveCoins(tags.username, -amount);
            giveCoins(targetUser, amount);
            chatbot.say(channel, `@${tags.username} gave ${amount} coins to @${targetUser}!`);
        }
    }
    if (command == 'leaderboard') {
        const leaderboard = Object.entries(coins)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

        let leaderboardStr = 'Leaderboard:\n';
        leaderboard.forEach(([username, coinCount], index) => {
            leaderboardStr += `${index +1}. ${username} - ${coinCount} coins\n`;
        });
        chatbot.say(channel, leaderboardStr);
    }
    if (command === 'gamble') {
        if (args.length === 0) {
            return;
        }

        let bet = args[0].toLowerCase();
        let userCoins = coins[username];
        
        
        if (bet.endsWith('%')) {
            const percentage = parseInt(bet.slice(0, -1));
            if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
                return;
            }
            bet = Math.floor((userCoins * percentage) / 100);
        } else {
            bet = parseInt(bet);
            if (isNaN(bet) || bet <= 0) {
                return;
            }
        } 

        if(bet === 'all') {
            bet = userCoins;
        }

        if (bet > userCoins) {
            chatbot.say(channel, `@${username}, you don't have enough coins to gamble that amount.`);
            return;
        }

        const outcome = Math.random() < 0.5;
        if (outcome) {
            coins[username] += bet; 
            chatbot.say(channel, `@${username}, hat ${bet} gesetzt und gewonnen du hast jetzt! ${userCoins + bet} coins.`);
        } else {
            coins[username] -= bet; 
            chatbot.say(channel, `@${username}, hat ${bet} gesetzt und verloren du hast jetzt! ${userCoins - bet} coins.`);
        }

        fs.writeFileSync(COIN_FILE, JSON.stringify(coins, null, 2));
    }

    
    if (command === 'followage') {
        const followageUrl = `https://decapi.me/twitch/followage/${channel.replace('#', '')}/${username}?token=`;
    
        try {
            const response = await axios.get(followageUrl);
            if (response.data && response.data !== "User not following channel") {
                chatbot.say(channel, `@${username}, you have been following for: ${response.data}`);
            } else {
                chatbot.say(channel, `@${username}, you are not following this channel.`);
            }
        } catch (error) {
            console.error('Error fetching followage:', error);
            chatbot.say(channel, `@${username}, there was an error fetching your followage.`);
        }
    }

    const isBroadcaster = tags.badges.broadcaster && tags.badges.broadcaster;
    const isModerator = tags.badges.moderator && tags.badges.moderator;
      
    if (command == 'raffle') {
        if(!isBroadcaster && !isModerator) {
            chatbot.say(channel, `@${username}, you dont have permission to start the raffle!`);
            return;
        }
        giveawayParticipants = [];
        chatbot.say(channel, "A raffle has startet! Type join to participate! you have 100 seconds!");

        setTimeout(() => {
            if (giveawayParticipants.length > 0) {
                const winnerIndex = Math.floor(Math.random() * giveawayParticipants.length);
                const winner = giveawayParticipants[winnerIndex];

                if (!coins[winner]) coins[winner] = 0
                coins[winner] += 4000;

                fs.writeFileSync(COIN_FILE, JSON.stringify(coins, null, 2));

                chatbot.say(channel, `@${winner} has won the raffle and recieved 4000 coins! 🎉`);
            } else {
                chatbot.say(channel, "No one joined the raffle in time :(");
            }
        }, 10000);
    }
    if (command == 'join') {
        if (!giveawayParticipants.includes(username)) {
            giveawayParticipants.push(username);
            chatbot.say(channel, `@${username} has joined the giveaway!`);
        } else { 
            client.say(channel, `@${username}, you're already in the raffle!`);
        }
        
    }
    if(command === 'commands') {
		chatbot.say(channel, `!discord, !lethimcook, !coins, !givecoins, !osu, !shop, !gamble[amount]`);
	}  
    if (command === 'settitle') {
        const newTitle = args.join(' '); // Join all parts of the command after the command name into a single string
        updateStream(channel, newTitle, null);  // Set the title, leaving game as null
    }

    if (command === 'setgame') {
        const newGame = args.join(' '); // Join all parts of the command after the command name into a single string
        updateStream(channel, null, newGame);  // Set the game name, leaving title as null
    }    
});



function giveCoins(username, amount) {
    if (!coins[username]) {
        coins[username] = 0;
    }
    coins[username] += amount;

    fs.writeFileSync(COIN_FILE, JSON.stringify(coins, null, 2));
}

setInterval(() => {
    Object.keys(coins).forEach(username => {
        giveCoins(username, 9);
    });
}, 540000);

console.log('Twitch bot is running...');
