import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

const DashboardPage = () => {
    const navigate = useNavigate();
    return <Dashboard onBack={() => navigate('/')} />;
};

export default DashboardPage;