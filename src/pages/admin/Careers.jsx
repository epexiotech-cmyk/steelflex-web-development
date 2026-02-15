import React, { useState, useEffect } from 'react';
import { apiService } from '../../adminService';
import '../../styles/admin.css';

const Careers = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadApplications();
    }, []);

    const loadApplications = async () => {
        try {
            const data = await apiService.getApplications();
            setApplications(data);
        } catch (error) {
            console.error('Error loading applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this application?')) return;
        try {
            await apiService.deleteApplication(id);
            loadApplications();
        } catch (error) {
            alert('Failed to delete application');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="content-area">
            <div className="content-block">
                <h3>Job Applications</h3>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Candidate</th>
                            <th>Applying For</th>
                            <th>Resume</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map(app => (
                            <tr key={app.id} style={{ backgroundColor: app.status === 'new' ? '#f0f9ff' : 'transparent' }}>
                                <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                                <td>
                                    <strong>{app.full_name}</strong>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{app.email}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{app.phone}</div>
                                </td>
                                <td>
                                    <span style={{ padding: '4px 8px', background: '#e2e8f0', borderRadius: '4px', fontSize: '0.85rem' }}>
                                        {app.position}
                                    </span>
                                </td>
                                <td>
                                    <a href={app.cv_path} target="_blank" rel="noopener noreferrer" className="btn-sm btn-secondary"
                                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <i className="fas fa-file-download"></i> Download CV
                                    </a>
                                </td>
                                <td>
                                    <button className="btn-sm btn-delete" onClick={() => handleDelete(app.id)} title="Delete">
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

export default Careers;
