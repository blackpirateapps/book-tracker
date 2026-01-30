import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

const DashboardPage = () => {
    const navigate = useNavigate();
    return (
        <Dashboard
            onBack={() => navigate('/')}
            onEdit={(id, book, password) => navigate(`/dashboard/edit/${id}`, { state: { book, password } })}
        />
    );
};

export default DashboardPage;
