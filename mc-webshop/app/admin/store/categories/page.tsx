'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { API_URL } from '../../../utils/config';
import Modal from '../../../components/Modal';
import { Plus, Pencil, Trash2, X, FolderKanban } from 'lucide-react';

interface Category {
    _id: string;
    name: string;
    description?: string;
    createdAt: string;
}

export default function AdminCategoriesPage() {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [modalProps, setModalProps] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'warning' | 'info',
        mode: 'alert' as 'alert' | 'confirm',
        onConfirm: () => { },
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', mode: 'alert' | 'confirm' = 'alert', onConfirm?: () => void) => {
        setModalProps({
            isOpen: true,
            title,
            message,
            type,
            mode,
            onConfirm: onConfirm || (() => { }),
        });
    };

    const closeModal = () => {
        setModalProps(prev => ({ ...prev, isOpen: false }));
    };

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (category?: Category) => {
        setError('');
        if (category) {
            setEditingCategory(category);
            setName(category.name);
            setDescription(category.description || '');
        } else {
            setEditingCategory(null);
            setName('');
            setDescription('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setName('');
        setDescription('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Category name is required.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const url = editingCategory
                ? `${API_URL}/api/categories/${editingCategory._id}`
                : `${API_URL}/api/categories`;
            const method = editingCategory ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: name.trim(), description: description.trim() })
            });

            const data = await res.json();

            if (res.ok) {
                fetchCategories();
                handleCloseModal();
                showModal('Success', 'Category saved successfully.', 'success');
            } else {
                setError(data.message || 'An error occurred.');
            }
        } catch (err) {
            console.error('Error saving category:', err);
            setError('Connection error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: Category) => {
        showModal(
            'Confirm Delete',
            `Are you sure you want to delete the category "${category.name}"? Products inside this category will be reset to General.`,
            'warning',
            'confirm',
            async () => {
                try {
                    const res = await fetch(`${API_URL}/api/categories/${category._id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`
                        }
                    });

                    if (res.ok) {
                        fetchCategories();
                        showModal('Deleted', 'Category deleted successfully.', 'success');
                    } else {
                        const data = await res.json();
                        showModal('Error', data.message || 'Failed to delete category.', 'error');
                    }
                } catch (err) {
                    console.error('Error deleting category:', err);
                    showModal('Error', 'Connection error.', 'error');
                }
            }
        );
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">จัดการหมวดหมู่ (Categories)</h1>
                        <p className="text-gray-400 text-sm mt-1">เพิ่ม ลบ หรือแก้ไขหมวดหมู่สินค้าในร้านค้า</p>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2.5 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-xl transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Category
                </button>
            </div>

            <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#2a2a2a] text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-6 font-medium">Category Name</th>
                                <th className="p-6 font-medium">Description</th>
                                <th className="p-6 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500">
                                        Loading categories...
                                    </td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500">
                                        No categories found.
                                    </td>
                                </tr>
                            ) : (
                                categories.map((category) => (
                                    <tr key={category._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-6 font-medium text-white">{category.name}</td>
                                        <td className="p-6 text-gray-400">{category.description || '-'}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(category)}
                                                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Category Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">
                                {editingCategory ? 'Edit Category' : 'Create Category'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">ชื่อหมวดหมู่ (Category Name)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                                    placeholder="e.g. Ranks, Weapons"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">รายละเอียด (Description)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none h-24 resize-none"
                                    placeholder="Brief description of the category..."
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingCategory ? 'Save' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Modal
                isOpen={modalProps.isOpen}
                onClose={closeModal}
                onConfirm={modalProps.onConfirm}
                title={modalProps.title}
                message={modalProps.message}
                type={modalProps.type}
                mode={modalProps.mode}
            />
        </div>
    );
}
