const express = require('express');
const Web3 = require('web3');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const cors = require('cors');



// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});


// Create express app
const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',  // allow requests from this domain
  credentials: true,  // allow the inclusion of cookies in requests
}));

// Set up Web3 provider
const web3 = new Web3(process.env.WEB3_PROVIDER);

// Set up rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Use rate limiter for all routes
app.use(limiter);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    req.userId = decoded.id;
    next();
  });
};

// Route to generate a nonce for one-click login
app.get('/login', (req, res) => {
  const nonce = uuid.v4();
  res.send({ nonce });
});

// Route to handle one-click login
app.post('/login', async (req, res) => {
  try {
    // Get user's Ethereum address from the signed message
    const { address, sig } = req.body;
    const recoveredAddress = await web3.eth.personal.ecRecover(nonce, sig);

    // Check that the recovered address matches the address provided
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).send({ auth: false, message: 'Invalid signature.' });
    }

    // Find or create the user in the database
    let user = await User.findOne({ address });
    if (!user) {
      user = new User({ address });
      await user.save();
    }

    // Create a JWT token for the user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: 86400 }); // expires in 24 hours

    // Return the token to the client
    res.send({ auth: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ auth: false, message: 'An error occurred while processing the request.' });
  }
});

// Protected route for authenticated users
app.get('/dashboard', verifyToken, (req, res) => {
  res.send({ message: 'You are authenticated and can access the dashboard.' });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Define the User schema
const UserSchema = new mongoose.Schema({
  address: String
});
const User = mongoose.model('User', UserSchema);
