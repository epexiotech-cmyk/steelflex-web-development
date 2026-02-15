import React, { useState, useEffect } from 'react';
import { apiService } from '../../adminService';
import '../../styles/admin.css';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        location: '',
        year: '',
        client: '',
        area: '',
        description: '',
        image: null
    });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await apiService.getProjects();
            setProjects(data);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            setFormData({ ...formData, image: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });

        try {
            await apiService.addProject(data);
            setShowModal(false);
            setFormData({
                title: '', category: '', location: '', year: '',
                client: '', area: '', description: '', image: null
            });
            loadProjects();
            alert('Project added successfully!');
        } catch (error) {
            alert('Failed to add project');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        try {
            await apiService.deleteProject(id);
            loadProjects();
        } catch (error) {
            alert('Failed to delete project');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="content-area">
            <div className="content-block">
                <h3>
                    Projects Management
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                        <i className="fas fa-plus"></i> Add New
                    </button>
                </h3>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Location</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map(project => (
                            <tr key={project.id}>
                                <td>
                                    {project.image_url && (
                                        <img src={project.image_url} alt={project.title}
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                    )}
                                </td>
                                <td>{project.title}</td>
                                <td>{project.category}</td>
                                <td>{project.location}</td>
                                <td>
                                    <button className="btn-sm btn-delete" onClick={() => handleDelete(project.id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div id="modal-container" style={{ display: 'flex' }}>
                    <div className="modal-content">
                        <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                        <h2>Add New Project</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Project Title</label>
                                <input type="text" name="title" className="form-control" required
                                    value={formData.title} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select name="category" className="form-control" required
                                    value={formData.category} onChange={handleInputChange}>
                                    <option value="">Select Category</option>
                                    <option value="Industrial">Industrial</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input type="text" name="location" className="form-control" required
                                    value={formData.location} onChange={handleInputChange} />
                            </div>
                            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label>Year</label>
                                    <input type="number" name="year" className="form-control" required
                                        value={formData.year} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label>Area (sq ft)</label>
                                    <input type="text" name="area" className="form-control" required
                                        value={formData.area} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Client Name</label>
                                <input type="text" name="client" className="form-control" required
                                    value={formData.client} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" className="form-control" rows="3" required
                                    value={formData.description} onChange={handleInputChange}></textarea>
                            </div>
                            <div className="form-group">
                                <label>Project Image</label>
                                <input type="file" name="image" className="form-control" accept="image/*" required
                                    onChange={handleInputChange} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Project</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
