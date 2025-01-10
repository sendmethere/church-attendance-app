import React from 'react';
import { Bar } from 'react-chartjs-2';

const Dashboard = () => {
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Attendance',
        data: [50, 60, 70, 80, 90, 100],
        backgroundColor: 'rgba(75,192,192,0.6)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ width: '600px', margin: '0 auto' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default Dashboard;
