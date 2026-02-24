import React, { useEffect, useState } from "react";
import "./ShopPage.scss";
import ProductList from "../../components/ProductList";     
import ProductModal from "../../components/ProductModal";   
import { api } from "../../api";                            

export default function ShopPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [editingProduct, setEditingProduct] = useState(null);

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
            alert("Ошибка загрузки товаров. Проверьте, запущен ли сервер (backend)");
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setModalMode("create");
        setEditingProduct(null);
        setModalOpen(true);
    };

    const openEdit = (product) => {
        setModalMode("edit");
        setEditingProduct(product);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProduct(null);
    };

    const handleDelete = async (id) => {
        const ok = window.confirm("Вы уверены, что хотите удалить этот товар?");
        if (!ok) return;

        try {
            await api.deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
            alert("Товар успешно удален!");
        } catch (err) {
            console.error("Ошибка удаления:", err);
            alert("Ошибка при удалении товара");
        }
    };

    const handleSubmitModal = async (productData) => {
        try {
            if (modalMode === "create") {
                const newProduct = await api.createProduct(productData);
                setProducts((prev) => [...prev, newProduct]);
                alert("Товар успешно создан!");
            } else {
                const updatedProduct = await api.updateProduct(productData.id, productData);
                setProducts((prev) =>
                    prev.map((p) => (p.id === productData.id ? updatedProduct : p))
                );
                alert("Товар успешно обновлен!");
            }
            closeModal();
        } catch (err) {
            console.error("Ошибка сохранения:", err);
            alert("Ошибка при сохранении товара");
        }
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
                        🛍️ MIRÉA Shop
                        <span>Интернет-магазин</span>
                    </div>
                    <div className="header__right">
                        React + Express
                    </div>
                </div>
            </header>

            <main className="main">
                <div className="container">
                    <div className="toolbar">
                        <h1 className="title">Каталог товаров</h1>
                        <div className="stats">
                            Всего товаров: {totalProducts}
                        </div>
                        <button className="btn btn--primary" onClick={openCreate}>
                            ➕ Добавить товар
                        </button>
                    </div>

                    {products.length > 0 && (
                        <div className="statsBar">
                            <div className="stat">
                                <span className="label">📦 Товаров:</span>
                                <span className="value">{totalProducts}</span>
                            </div>
                            <div className="stat">
                                <span className="label">📊 На складе:</span>
                                <span className="value">{totalStock} шт.</span>
                            </div>
                            <div className="stat">
                                <span className="label">💰 Средняя цена:</span>
                                <span className="value">{avgPrice.toLocaleString()} ₽</span>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading">Загрузка товаров...</div>
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
                    <span>© {new Date().getFullYear()} MIRÉA Shop</span>
                    <span>Практическое занятие 4: API + React</span>
                </div>
            </footer>

            <ProductModal
                open={modalOpen}
                mode={modalMode}
                initialProduct={editingProduct}
                onClose={closeModal}
                onSubmit={handleSubmitModal}
            />
        </div>
    );
}