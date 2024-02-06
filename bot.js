require('dotenv').config();

const { Client, Intents, MessageCollector } = require('discord.js');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a mongoose model for storing Karuta messages
const KarutaMessage = mongoose.model('KarutaMessage', {
  content: String,
  // Add other fields you want to store
});

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});

const karutaBotId = '646937666251915264'; // Replace with the actual Karuta bot ID

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
  try {
    console.log('Received message:', message.content);

    if (message.author.bot && message.author.id !== karutaBotId) return;

    // Check if the message is an embedded message from the Karuta bot
    if (message.embeds.length > 0 && message.author.id === karutaBotId) {
      const embed = message.embeds[0];

      // Assuming card information is in the description of the embed
      const cardInfo = embed.description;

      // Check if the cardInfo contains the specified information
      if (cardInfo.includes("that player has the `k!collection` command set to private.") ||
          cardInfo.includes("The list is empty.") ||
          /^\s*$/.test(cardInfo)) {
        console.log('Private collection, empty list, or whitespace detected. Not storing it.');
        return; // Skip storing to file
      }

      // Save Karuta message to MongoDB
      const karutaMessage = new KarutaMessage({ content: cardInfo });
      await karutaMessage.save();

      console.log('Karuta message saved to MongoDB:', cardInfo);
    }

    if (message.content.toLowerCase() === '?listen') {
      console.log('Listening command detected:', message.content);

      await message.channel.send('Bot is collecting Karuta messages now...');

      const collector = new MessageCollector(message.channel, (m) => m.author.id === karutaBotId, {
        time: Infinity,
      });

      collector.on('collect', (collectedMessage) => {
        console.log('Collected Karuta message:', collectedMessage.content);

        // Save collected Karuta message to MongoDB
        const karutaMessage = new KarutaMessage({ content: collectedMessage.content });
        karutaMessage.save();
      });

      collector.on('end', (collected) => {
        console.log(`Karuta messages collected: ${collected.size}`);
      });
    }
  } catch (error) {
    console.error('Error collecting messages:', error);
  }
});

client.login(process.env.BOT_TOKEN);
