import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { getCurrentUser } from "../../api/auth";
import "./AdminPage.scss";

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const currentUser = getCurrentUser();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Ошибка загрузки пользователей:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async (userId) => {
        try {
            await api.blockUser(userId);
            loadUsers();
        } catch (err) {
            console.error("Ошибка блокировки:", err);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("Удалить пользователя?")) return;
        if (userId === currentUser.id) {
            alert("Нельзя удалить самого себя");
            return;
        }
        try {
            await api.deleteUser(userId);
            loadUsers();
        } catch (err) {
            console.error("Ошибка удаления:", err);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await api.updateUser(editingUser.id, editingUser);
            setEditingUser(null);
            loadUsers();
        } catch (err) {
            console.error("Ошибка обновления:", err);
        }
    };

    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="admin-page">
            <div className="container">
                <div className="header">
                    <h1>Управление пользователями</h1>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                        ← На главную
                    </button>
                </div>

                <div className="users-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Имя</th>
                                <th>Фамилия</th>
                                <th>Роль</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className={user.isBlocked ? 'blocked' : ''}>
                                    <td>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        {editingUser?.id === user.id ? (
                                            <input
                                                value={editingUser.firstName || ''}
                                                onChange={(e) => setEditingUser({
                                                    ...editingUser,
                                                    firstName: e.target.value
                                                })}
                                            />
                                        ) : user.firstName}
                                    </td>
                                    <td>
                                        {editingUser?.id === user.id ? (
                                            <input
                                                value={editingUser.lastName || ''}
                                                onChange={(e) => setEditingUser({
                                                    ...editingUser,
                                                    lastName: e.target.value
                                                })}
                                            />
                                        ) : user.lastName}
                                    </td>
                                    <td>
                                        {editingUser?.id === user.id ? (
                                            <select
                                                value={editingUser.role}
                                                onChange={(e) => setEditingUser({
                                                    ...editingUser,
                                                    role: e.target.value
                                                })}
                                            >
                                                <option value="user">User</option>
                                                <option value="seller">Seller</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : user.role}
                                    </td>
                                    <td>{user.isBlocked ? 'Заблокирован' : 'Активен'}</td>
                                    <td className="actions">
                                        {editingUser?.id === user.id ? (
                                            <>
                                                <button className="btn btn-small btn-success" onClick={handleUpdateUser}>
                                                    Сохранить
                                                </button>
                                                <button className="btn btn-small" onClick={() => setEditingUser(null)}>
                                                    Отмена
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    className="btn btn-small btn-primary"
                                                    onClick={() => setEditingUser(user)}
                                                >
                                                    Изменить
                                                </button>
                                                <button 
                                                    className={`btn btn-small ${user.isBlocked ? 'btn-success' : 'btn-warning'}`}
                                                    onClick={() => handleBlock(user.id)}
                                                >
                                                    {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                                </button>
                                                <button 
                                                    className="btn btn-small btn-danger"
                                                    onClick={() => handleDelete(user.id)}
                                                    disabled={user.id === currentUser?.id}
                                                >
                                                    Удалить
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}