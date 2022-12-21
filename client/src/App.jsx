import React, { useState } from 'react';
import axios from 'axios';
import Web3 from 'web3';

function App() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSignNonce() {
    try {
      // Check if MetaMask is available
      if (window.ethereum) {
        // Request account access if needed
        await window.ethereum.enable();

        // Get the user's Ethereum address
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // Send the address to the server to get a nonce
        const nonceResponse = await axios.get('/login');
        const nonce = nonceResponse.data.nonce;

        // Sign the nonce
        const web3 = new Web3(window.ethereum);
        const sig = await web3.eth.personal.sign(nonce, address);

        // Send the signed message to the server
        const response = await axios.post('/login', { address, sig });
        setToken(response.data.token);
        setAuthenticated(true);
      } else {
        console.error('MetaMask is not available');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleGetProtectedMessage() {
    try {
      const response = await axios.get('/dashboard', { headers: { 'x-access-token': token } });
      setMessage(response.data.message);
    } catch (error) {
      console.error(error);
    }
  }
  return (
    <div>
      <button onClick={handleSignNonce}>Sign Nonce with MetaMask</button>
      <br />
      <br />
      {authenticated && (
        <>
          <button onClick={handleGetProtectedMessage}>Get Protected Message</button>
          <br />
          <br />
          {message && (
            <p>{message}</p>
          )}
        </>
      )}
    </div>
  );
}

export default App;