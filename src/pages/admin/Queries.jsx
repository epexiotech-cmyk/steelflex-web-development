import React, { useState, useEffect } from 'react';
import { apiService } from '../../adminService';
import '../../styles/admin.css';

const Queries = () => {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadQueries();
    }, []);

    const loadQueries = async () => {
        try {
            const data = await apiService.getQueries();
            setQueries(data);
        } catch (error) {
            console.error('Error loading queries:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await apiService.markQueryRead(id);
            loadQueries();
        } catch (error) {
            alert('Failed to update query status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this query?')) return;
        try {
            await apiService.deleteQuery(id);
            loadQueries();
        } catch (error) {
            alert('Failed to delete query');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="content-area">
            <div className="content-block">
                <h3>Contact Queries</h3>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Name</th>
                            <th>Contact Info</th>
                            <th>Message</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queries.map(query => (
                            <tr key={query.id} style={{ backgroundColor: query.status === 'new' ? '#f0f9ff' : 'transparent' }}>
                                <td>{new Date(query.created_at).toLocaleDateString()}</td>
                                <td>{query.name}</td>
                                <td>
                                    <div>{query.email}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{query.phone}</div>
                                </td>
                                <td>{query.message}</td>
                                <td>
                                    {query.status === 'new' && (
                                        <button className="btn-sm btn-edit" onClick={() => handleMarkRead(query.id)} title="Mark as Read">
                                            <i className="fas fa-check-double"></i>
                                        </button>
                                    )}
                                    <button className="btn-sm btn-delete" onClick={() => handleDelete(query.id)} title="Delete">
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

export default Queries;
