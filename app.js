import express from 'express';

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const app = express();
app.use(express.json());

const port = 3000;
const token =
	'eb5ba818d54a12fb679eb03c4316b90545a3d4c90fbc839d2c15b256a9690e8c922ed93b62a7f2642b126bee9c220ee4ff18bf0682bb489f2dec80ab4636a98eee2fb180b447ca0fb4a87739a627a52f9d3b3aadf1b5aca260eb01fdf354b04ca0a3f5adce36dbe8f96162dd63c977d8146704ec04b41cf7cf71248dc4879fca';

const clientID = 'whatsappexpress';
const sessionsPath = `./data/${clientID}`;

// WHATSAPP CLIENT

const client = new Client({
	puppeteer: {
		headless: true
	},
	authStrategy: new LocalAuth({
		clientId: clientID,
		dataPath: sessionsPath
	})
});

client.on('qr', (qr) => {
	// Generate and scan this code with your phone
	qrcode.generate(qr, { small: true });
	console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
	console.log('Client is ready!');
});

client.on('message', (msg) => {
	console.log(msg);
});

client.initialize();

// INSTALL EXPRESS-LIMITER

const validation = (req, res, next) => {
	if (!req.headers.authorization) {
		return res.status(403).json({ error: 'No credentials sent!' });
	}
	if (req.headers.authorization !== `Bearer ${token}`) {
		return res.status(403).json({ error: 'Wrong credentials sent!' });
	}

	next();
};

app.use(validation);

app.get('/', async (req, res) => {
	const jsonData = req.body;
	const shallIReallySend = jsonData.send;
	//	const receiverToSend = '4917661144643';
	const messageToSend = jsonData.message;
	const receiverToSend = jsonData.receiver;

	let number = receiverToSend;
	let message = messageToSend;
	number = number.includes('@c.us') ? number : `${number}@c.us`;

	if (shallIReallySend) {
		const registeredUser = await client.isRegisteredUser(number);
		if (registeredUser) {
			const success = await client.sendMessage(number, message);
			res.json({
				ok: true,
				registeredUser: registeredUser,
				success: success
			});
		} else {
			res.json({
				ok: false,
				registeredUser: registeredUser,
				error: 'User not registered'
			});
		}

		return;
	}

	res.json({
		ok: false,
		messageToSend: message,
		receiver: receiverToSend,
		error: 'No Send Command Found'
	});
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
