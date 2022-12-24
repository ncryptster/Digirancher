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
app.use(cors());

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

// GET /api/users?publicAddress=<publicAddress>
// Retrieves the nonce associated with the given public address
app.get('/api/users', (req, res) => {
  const { publicAddress } = req.query;
  User.findOne({ publicAddress }, 'nonce', (err, user) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (!user) {
      return res.status(404).send('No user found with that public address');
    }
    res.send(user);
  });
});

// POST /api/authentication
// Performs message-signing based authentication
app.post('/api/authentication', (req, res) => {
  const { publicAddress, signature } = req.body;

  User.findOne({ publicAddress }, 'nonce', (err, user) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (!user) {
      return res.status(401).send('No user found with that public address');
    }

    // Use the web3 library to verify the signature
    const isValid = web3.eth.personal.ecRecover(user.nonce, signature) === publicAddress;
    if (isValid) {
      // If the signature is valid, generate a JWT and send it back to the client
      const token = jwt.sign(payload, secret, { expiresIn: expiration }, (err, token) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send({ token });
      });
      const secret = process.env.JWT_SECRET;
      const expiration = '7d'; // JWT will expire after 7 days
      const payload = { publicAddress };
      jwt.sign(payload, secret, { expiresIn: expiration }, (err, token) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send({ token });
      });
    } else {
      res.status(401).send('Invalid signature');
    }
  });
});


// POST /users
// Creates a new account
app.post('/users', (req, res) => {
  const { publicAddress } = req.body;
  const user = new User({ publicAddress });
  user.save((err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.send(user);
  });
});

// Protected route
app.get('/dashboard', verifyJWT, (req, res) => {
  // The user's public address is stored in the JWT payload
  const { publicAddress } = req.user;
  res.send(`Welcome to the dashboard, ${publicAddress}!`);
});

// Middleware function to verify JWT
function verifyJWT(req, res, next) {
  const token = req.headers['x-access-token'];
  if (!token) {
    return res.status(401).send('No token provided');
  }
  const secret = process.env.JWT_SECRET;
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).send('Invalid token');
    }
    req.user = decoded;
    next();
  });
}


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Define the User schema
const UserSchema = new mongoose.Schema({
  publicAddress: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: '{VALUE} is not a valid Ethereum address'
    }
  },
  nonce: {
    type: String,
    default: () => uuid.v4()
  }
});
const User = mongoose.model('User', UserSchema);
