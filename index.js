const express = require('express')
const fs = require('fs').promises
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const bcrypt = require('bcrypt')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: '*', // Render uchun
		methods: ['GET', 'POST'],
	},
})

app.use(cors())
app.use(express.json())

// JSON fayl funksiyalar
const readUsers = async () => {
	try {
		const data = await fs.readFile('users.json', 'utf8')
		return JSON.parse(data)
	} catch {
		return []
	}
}

const writeUsers = async users => {
	await fs.writeFile('users.json', JSON.stringify(users, null, 2))
}

const readMessages = async () => {
	try {
		const data = await fs.readFile('posts.json', 'utf8')
		return JSON.parse(data)
	} catch {
		return []
	}
}

const writeMessages = async messages => {
	await fs.writeFile('posts.json', JSON.stringify(messages, null, 2))
}

// API Routes
app.get('/users', async (req, res) => {
	const users = await readUsers()
	res.json(users.map(user => ({ id: user.id, name: user.name })))
})

app.post('/signup', async (req, res) => {
	const { name, password } = req.body
	const users = await readUsers()

	if (users.find(user => user.name === name)) {
		return res.status(400).json({ error: 'User already exists' })
	}

	const hashedPassword = await bcrypt.hash(password, 10)

	const newUser = {
		id: (users.length + 1).toString(),
		name,
		password: hashedPassword,
	}
	users.push(newUser)
	await writeUsers(users)
	res.json({ message: 'Signup successful' })
})

app.post('/login', async (req, res) => {
	const { name, password } = req.body
	const users = await readUsers()
	const user = users.find(user => user.name === name)
	if (!user) {
		return res.status(400).json({ error: 'User not found' })
	}
	const match = await bcrypt.compare(password, user.password)
	if (match) {
		res.json({ message: 'Login successful' })
	} else {
		res.status(400).json({ error: 'Incorrect password' })
	}
})

app.get('/messages', async (req, res) => {
	const messages = await readMessages()
	const { sender, receiver } = req.query

	if (sender && receiver) {
		const filteredMessages = messages.filter(
			msg =>
				(msg.sender === sender && msg.receiver === receiver) ||
				(msg.sender === receiver && msg.receiver === sender)
		)
		return res.json(filteredMessages)
	}

	res.json(messages)
})

app.post('/messages', async (req, res) => {
	const messages = await readMessages()
	const newMessage = {
		_id: Date.now().toString(),
		sender: req.body.sender,
		receiver: req.body.receiver,
		content: req.body.content,
		createdAt: new Date(),
	}
	messages.push(newMessage)
	await writeMessages(messages)

	// Real-time emit qilish
	io.emit('newMessage', newMessage)

	res.json(newMessage)
})

app.get('/ping', (req, res) => res.send('pong')) // Render Sleep oldini olish uchun

// SOCKET.IO CONNECTION
io.on('connection', socket => {
	console.log('User connected:', socket.id)

	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id)
	})
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
