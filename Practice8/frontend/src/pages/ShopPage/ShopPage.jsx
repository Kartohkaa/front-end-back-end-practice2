import React, { useEffect, useState } from "react";
import "./ShopPage.scss";
import ProductList from "../../components/ProductList";
import ProductModal from "../../components/ProductModal";
import AuthModal from "../../components/AuthModal";
import { api } from "../../api";
import { isAuthenticated, logout, getCurrentUser } from "../../api/auth";

export default function ShopPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [editingProduct, setEditingProduct] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(getCurrentUser());

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getProducts();
            setProducts(data);
        } catch (err) {
            console.error("Ошибка загрузки:", err);
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = (action) => {
        if (!isAuthenticated()) {
            setAuthModalOpen(true);
            return false;
        }
        action();
        return true;
    };

    const openCreate = () => {
        checkAuth(() => {
            setModalMode("create");
            setEditingProduct(null);
            setModalOpen(true);
        });
    };

    const openEdit = (product) => {
        checkAuth(() => {
            setModalMode("edit");
            setEditingProduct(product);
            setModalOpen(true);
        });
    };

    const handleDelete = async (id) => {
        if (!checkAuth(() => {})) return;

        if (!window.confirm("Вы уверены?")) return;

        try {
            await api.deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error("Ошибка удаления:", err);
        }
    };

    const handleSubmitModal = async (productData) => {
        try {
            if (modalMode === "create") {
                const newProduct = await api.createProduct(productData);
                setProducts((prev) => [...prev, newProduct]);
            } else {
                const updatedProduct = await api.updateProduct(productData.id, productData);
                setProducts((prev) =>
                    prev.map((p) => (p.id === productData.id ? updatedProduct : p))
                );
            }
            closeModal();
        } catch (err) {
            console.error("Ошибка сохранения:", err);
        }
    };

    const handleLogout = () => {
        logout();
        setCurrentUser(null);
    };

    const handleAuthSuccess = () => {
        setCurrentUser(getCurrentUser());
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProduct(null);
    };

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const avgPrice = products.length
        ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length)
        : 0;

    return (
        <div className="page">
            <header className="header">
                <div className="header__inner">
                    <div className="brand">
                        MIREA Shop
                        <span>JWT Авторизация</span>
                    </div>
                    <div className="header__right">
                        {currentUser ? (
                            <>
                                <span>{currentUser.firstName || currentUser.email}</span>
                                <button className="btn btn-small" onClick={handleLogout}>
                                    Выйти
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-primary" onClick={() => setAuthModalOpen(true)}>
                                Войти
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="main">
                <div className="container">
                    <div className="toolbar">
                        <h1 className="title">Каталог товаров</h1>
                        <div className="stats">Всего товаров: {totalProducts}</div>
                        {currentUser && (
                            <button className="btn btn--primary" onClick={openCreate}>
                                Добавить товар
                            </button>
                        )}
                    </div>

                    {products.length > 0 && (
                        <div className="statsBar">
                            <div className="stat">
                                <span className="label">Товаров:</span>
                                <span className="value">{totalProducts}</span>
                            </div>
                            <div className="stat">
                                <span className="label">На складе:</span>
                                <span className="value">{totalStock} шт.</span>
                            </div>
                            <div className="stat">
                                <span className="label">Средняя цена:</span>
                                <span className="value">{avgPrice.toLocaleString()} ₽</span>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading">Загрузка...</div>
                    ) : (
                        <ProductList
                            products={products}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </main>

            <footer className="footer">
                <div className="footer__inner">
                    <span>© {new Date().getFullYear()} MIREA Shop</span>
                    <span>Практика 8: JWT Авторизация</span>
                </div>
            </footer>

            <ProductModal
                open={modalOpen}
                mode={modalMode}
                initialProduct={editingProduct}
                onClose={closeModal}
                onSubmit={handleSubmitModal}
            />

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onAuthSuccess={handleAuthSuccess}
            />
        </div>
    );
}