import React from 'react';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import web3 from 'web3';

function LoginButton() {
  async function handleLogin() {
    // Check if MetaMask is installed and enabled
    if (!web3.currentProvider.isMetaMask) {
      alert('Please install MetaMask and refresh the page');
      return;
    }

    // Get the user's public address
    const publicAddress = await web3.eth.getCoinbase();

    // Make a GET request to retrieve the nonce associated with the public address
    const { data: user } = await axios.get(`/api/users?publicAddress=${publicAddress}`);
    if (!user) {
      // If the user does not exist, create a new account
      await axios.post('/users', { publicAddress });
      // Fetch the nonce again
      const { data: user } = await axios.get(`/api/users?publicAddress=${publicAddress}`);
    }
    const { nonce } = user;

    // Prompt the user to sign the nonce
    const signature = await web3.eth.personal.sign(nonce, publicAddress);

    // Make a POST request to the /authentication route, passing the signature and public address
    const { data: { token } } = await axios.post('/api/authentication', { signature, publicAddress });

    // Store the JWT in local storage
    localStorage.setItem('jwt', token);

    // Redirect to the dashboard
    window.location = '/dashboard';
  }

  return (
    <button onClick={handleLogin}>
      Login with MetaMask
    </button>
  );
}

export default LoginButton;

