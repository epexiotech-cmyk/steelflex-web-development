import React, { useState, useEffect } from 'react';
import { apiService } from '../../adminService';
import '../../styles/admin.css';

const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            const data = await apiService.getReviews();
            setReviews(data);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await apiService.approveReview(id);
            loadReviews();
        } catch (error) {
            alert('Failed to approve review');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Reject this review?')) return;
        try {
            await apiService.rejectReview(id);
            loadReviews();
        } catch (error) {
            alert('Failed to reject review');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this review completely?')) return;
        try {
            await apiService.deleteReview(id);
            loadReviews();
        } catch (error) {
            alert('Failed to delete review');
        }
    };

    const filteredReviews = reviews.filter(review => {
        if (filter === 'all') return true;
        if (filter === 'pending') return review.status === 'Pending';
        if (filter === 'approved') return review.status === 'Approved';
        if (filter === 'rejected') return review.status === 'Rejected';
        return true;
    });

    if (loading) return <div>Loading...</div>;

    return (
        <div className="content-area">
            <div className="content-block">
                <h3>Client Reviews</h3>

                <div className="filter-bar">
                    <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                    <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
                    <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>Approved</button>
                    <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>Rejected</button>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Rating</th>
                            <th>Review</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReviews.map(review => (
                            <tr key={review.id}>
                                <td>
                                    <div>
                                        <strong>{review.client_name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{review.company}</div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ color: '#fbbf24' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <i key={i} className={`fas fa-star ${i < review.rating ? '' : 'text-gray-300'}`}
                                                style={{ color: i < review.rating ? '#fbbf24' : '#e5e7eb' }}></i>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <p style={{ maxWidth: '300px', fontSize: '0.9rem' }}>{review.review_text}</p>
                                    {review.project_image && (
                                        <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#264796' }}>
                                            <i className="fas fa-image"></i> Has Project Image
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                                        backgroundColor: review.status === 'Approved' ? '#dcfce7' : review.status === 'Rejected' ? '#fee2e2' : '#fef9c3',
                                        color: review.status === 'Approved' ? '#166534' : review.status === 'Rejected' ? '#991b1b' : '#854d0e'
                                    }}>
                                        {review.status}
                                    </span>
                                </td>
                                <td>
                                    {review.status === 'Pending' && (
                                        <>
                                            <button className="btn-sm btn-success" onClick={() => handleApprove(review.id)} title="Approve">
                                                <i className="fas fa-check"></i>
                                            </button>
                                            <button className="btn-sm btn-danger" onClick={() => handleReject(review.id)} title="Reject">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </>
                                    )}
                                    <button className="btn-sm btn-delete" onClick={() => handleDelete(review.id)} title="Delete">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reviews;
