import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookDetails from '../components/BookDetails';

const BookDetailsPage = ({ tagsMap }) => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <BookDetails 
            bookId={id} 
            onBack={() => navigate(-1)} 
            tagsMap={tagsMap} 
        />
    );
};

export default BookDetailsPage;