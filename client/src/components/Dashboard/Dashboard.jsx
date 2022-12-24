import React from 'react';
import jwt from 'jsonwebtoken';

function Dashboard() {
  // Verify the JWT and extract the public address
  const token = localStorage.getItem('jwt');
  const { publicAddress } = jwt.verify(token, process.env.JWT_SECRET);

  return (
    <div>
      Welcome to the dashboard, {publicAddress}!
    </div>
  );
}

export default Dashboard;

