import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BookDetails from '../components/BookDetails';

const BookDetailsPage = ({ tagsMap }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get the book object passed from the previous page, if available
    const initialBookData = location.state?.book;

    return (
        <BookDetails 
            bookId={id}
            initialData={initialBookData} 
            onBack={() => navigate(-1)} 
            tagsMap={tagsMap} 
        />
    );
};

export default BookDetailsPage;